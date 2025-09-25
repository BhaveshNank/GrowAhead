const Decimal = require('decimal.js');

/**
 * Calculate round-up amount for a given transaction amount
 * @param {number|string} amount - Transaction amount
 * @param {number} roundUpTo - Round up to nearest (default: 1)
 * @returns {string} - Round-up amount as string to avoid floating point issues
 */
function calculateRoundUp(amount, roundUpTo = 1) {
    try {
        const decimal = new Decimal(amount);
        const roundTo = new Decimal(roundUpTo);
        
        // Always round UP to the next whole dollar, even if already whole
        const rounded = decimal.dividedBy(roundTo).floor().plus(1).times(roundTo);
        
        // Calculate difference (spare change)
        const roundUpAmount = rounded.minus(decimal);
        
        return roundUpAmount.toFixed(2);
    } catch (error) {
        throw new Error(`Invalid amount for round-up calculation: ${amount}`);
    }
}

/**
 * Calculate time-weighted growth for individual roundups
 * @param {Array} roundups - Array of roundup objects with {amount, createdAt}
 * @param {number} annualReturnRate - Annual return rate (e.g., 0.05 for 5%)
 * @param {Date} currentDate - Current date for calculation (default: now)
 * @returns {Object} - Detailed time-weighted growth analysis
 */
function calculateTimeWeightedGrowth(roundups, annualReturnRate, currentDate = new Date()) {
    const dailyReturnRate = new Decimal(annualReturnRate).dividedBy(365);
    let totalPrincipal = new Decimal(0);
    let totalGrowth = new Decimal(0);
    const roundupDetails = [];

    for (const roundup of roundups) {
        const principal = new Decimal(roundup.amount);
        const investmentDate = new Date(roundup.createdAt);
        
        // Calculate days invested (minimum 0 days for same-day investments)
        const daysInvested = Math.max(0, Math.floor((currentDate - investmentDate) / (1000 * 60 * 60 * 24)));
        
        // Calculate growth for this specific roundup
        // Formula: Growth = Principal * (dailyRate * daysInvested)
        // Using simple interest for daily calculations to avoid compounding complexity
        const growthAmount = principal.times(dailyReturnRate).times(daysInvested);
        
        // Apply growth caps to prevent unrealistic returns
        const maxGrowthRate = new Decimal(0.30); // 30% maximum growth
        const actualGrowthRate = growthAmount.dividedBy(principal);
        const cappedGrowthAmount = actualGrowthRate.greaterThan(maxGrowthRate) 
            ? principal.times(maxGrowthRate)
            : growthAmount;

        totalPrincipal = totalPrincipal.plus(principal);
        totalGrowth = totalGrowth.plus(cappedGrowthAmount);

        roundupDetails.push({
            amount: principal.toFixed(2),
            createdAt: roundup.createdAt,
            daysInvested,
            growthAmount: cappedGrowthAmount.toFixed(4),
            currentValue: principal.plus(cappedGrowthAmount).toFixed(2),
            dailyRate: dailyReturnRate.toFixed(6)
        });
    }

    const totalCurrentValue = totalPrincipal.plus(totalGrowth);
    const overallGrowthRate = totalPrincipal.greaterThan(0) 
        ? totalGrowth.dividedBy(totalPrincipal).times(100) 
        : new Decimal(0);

    return {
        totalPrincipal: totalPrincipal.toFixed(2),
        totalGrowth: totalGrowth.toFixed(2),
        totalCurrentValue: totalCurrentValue.toFixed(2),
        overallGrowthRate: overallGrowthRate.toFixed(3),
        totalRoundups: roundups.length,
        roundupDetails,
        calculationInfo: {
            annualReturnRate: (new Decimal(annualReturnRate).times(100)).toFixed(2),
            dailyReturnRate: dailyReturnRate.toFixed(6),
            calculationDate: currentDate.toISOString(),
            method: 'time-weighted-simple-interest'
        }
    };
}

/**
 * Generate time-weighted portfolio history for charts
 * @param {Array} roundups - Array of roundup objects with {amount, createdAt}
 * @param {number} annualReturnRate - Annual return rate
 * @param {string} period - Period for grouping ('7d', '30d', '90d', '1y')
 * @param {Date} endDate - End date for calculation (default: now)
 * @returns {Array} - Array of daily/weekly portfolio values
 */
function generatePortfolioHistory(roundups, annualReturnRate, period = '30d', endDate = new Date()) {
    if (roundups.length === 0) {
        return [];
    }

    // Sort roundups by creation date
    const sortedRoundups = roundups.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Determine date range and interval
    const intervals = {
        '7d': { days: 7, groupBy: 'day' },
        '30d': { days: 30, groupBy: 'day' },
        '90d': { days: 90, groupBy: 'day' },
        '1y': { days: 365, groupBy: 'week' }
    };

    const config = intervals[period] || intervals['30d'];
    const startDate = new Date(endDate.getTime() - (config.days * 24 * 60 * 60 * 1000));
    
    // Generate date points
    const datePoints = [];
    const intervalMs = config.groupBy === 'day' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    
    for (let date = new Date(startDate); date <= endDate; date = new Date(date.getTime() + intervalMs)) {
        datePoints.push(new Date(date));
    }

    // Calculate portfolio value for each date point
    const history = datePoints.map((date, index) => {
        // Get roundups that existed by this date
        const activeRoundups = sortedRoundups.filter(r => new Date(r.createdAt) <= date);
        
        // Calculate roundups added on this specific date (for frontend compatibility)
        const previousDate = index > 0 ? datePoints[index - 1] : new Date(date.getTime() - intervalMs);
        const roundupsAddedThisDate = sortedRoundups.filter(r => {
            const roundupDate = new Date(r.createdAt);
            return roundupDate > previousDate && roundupDate <= date;
        });
        
        const amountAdded = roundupsAddedThisDate.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        
        if (activeRoundups.length === 0) {
            return {
                date: date.toISOString().split('T')[0],
                totalBalance: 0,
                contributions: 0,
                growth: 0,
                growthRate: 0,
                roundupCount: 0,
                amountAdded: 0 // Frontend compatibility
            };
        }

        // Calculate time-weighted growth for this date
        const analysis = calculateTimeWeightedGrowth(activeRoundups, annualReturnRate, date);
        
        return {
            date: date.toISOString().split('T')[0],
            totalBalance: parseFloat(analysis.totalCurrentValue),
            contributions: parseFloat(analysis.totalPrincipal),
            growth: parseFloat(analysis.totalGrowth),
            growthRate: parseFloat(analysis.overallGrowthRate),
            roundupCount: activeRoundups.length,
            amountAdded: parseFloat(amountAdded.toFixed(2)) // Frontend compatibility
        };
    });

    return history;
}

/**
 * Calculate period-specific growth metrics
 * @param {Array} roundups - Array of roundup objects
 * @param {number} annualReturnRate - Annual return rate
 * @param {string} period - Period ('7d', '30d', '90d', '1y')
 * @returns {Object} - Period growth analysis
 */

function calculatePeriodGrowth(roundups, annualReturnRate, period = '30d') {
    const now = new Date();
    const periodDays = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
    };

    const days = periodDays[period] || 30;
    const periodStart = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    // CORRECT: Only get roundups that existed BEFORE the period started
    const existingRoundups = roundups.filter(r => new Date(r.createdAt) < periodStart);
    
    // Get roundups added DURING this period
    const periodRoundups = roundups.filter(r => new Date(r.createdAt) >= periodStart);
    const addedThisPeriod = periodRoundups.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    
    // Calculate current value of ALL roundups
    const allRoundupsAnalysis = calculateTimeWeightedGrowth(roundups, annualReturnRate, now);
    const currentBalance = parseFloat(allRoundupsAnalysis.totalCurrentValue);
    
    // CORRECT: Calculate what the EXISTING roundups were worth at period start
    let periodStartBalance = 0;
    let periodStartGrowth = 0;
    
    if (existingRoundups.length > 0) {
        const periodStartAnalysis = calculateTimeWeightedGrowth(existingRoundups, annualReturnRate, periodStart);
        periodStartBalance = parseFloat(periodStartAnalysis.totalCurrentValue);
        periodStartGrowth = parseFloat(periodStartAnalysis.totalGrowth);
    }
    
    // CORRECT: Calculate what the EXISTING roundups are worth now
    let existingRoundupsCurrentValue = 0;
    let existingRoundupsCurrentGrowth = 0;
    
    if (existingRoundups.length > 0) {
        const existingRoundupsNowAnalysis = calculateTimeWeightedGrowth(existingRoundups, annualReturnRate, now);
        existingRoundupsCurrentValue = parseFloat(existingRoundupsNowAnalysis.totalCurrentValue);
        existingRoundupsCurrentGrowth = parseFloat(existingRoundupsNowAnalysis.totalGrowth);
    }
    
    // CORRECT: Growth this period = Growth increase on existing roundups ONLY
    const growthThisPeriod = existingRoundupsCurrentGrowth - periodStartGrowth;
    
    // CORRECT: Growth rate based on period start balance
    const growthRate = periodStartBalance > 0 
        ? (growthThisPeriod / periodStartBalance) * 100
        : 0;

    return {
        period,
        addedThisPeriod: parseFloat(addedThisPeriod.toFixed(2)),
        growthThisPeriod: parseFloat(Math.max(0, growthThisPeriod).toFixed(2)),
        growthRate: parseFloat(Math.max(0, growthRate).toFixed(2)),
        currentBalance: currentBalance,
        periodStart: periodStart.toISOString(),
        periodEnd: now.toISOString(),
        debug: {
            existingRoundupsCount: existingRoundups.length,
            newRoundupsCount: periodRoundups.length,
            periodStartBalance,
            existingRoundupsCurrentValue,
            periodStartGrowth,
            existingRoundupsCurrentGrowth,
            growthIncrease: growthThisPeriod
        }
    };
}

/**
 * Calculate compound interest projection
 * @param {number|string} principal - Initial amount
 * @param {number|string} rate - Annual interest rate (e.g., 0.08 for 8%)
 * @param {number} compoundingFrequency - Times compounded per year (default: 12 for monthly)
 * @param {number} years - Number of years
 * @returns {string} - Future value as string
 */
function calculateCompoundInterest(principal, rate, compoundingFrequency = 12, years = 1) {
    try {
        const P = new Decimal(principal);
        const r = new Decimal(rate);
        const n = new Decimal(compoundingFrequency);
        const t = new Decimal(years);
        
        // Formula: FV = P * (1 + r/n)^(n*t)
        const ratePerPeriod = r.dividedBy(n);
        const exponent = n.times(t);
        const futureValue = P.times(ratePerPeriod.plus(1).pow(exponent));
        
        return futureValue.toFixed(2);
    } catch (error) {
        throw new Error(`Error calculating compound interest: ${error.message}`);
    }
}

/**
 * Process multiple transactions and calculate total round-ups
 * @param {Array} transactions - Array of transaction objects with amount property
 * @param {number} roundUpTo - Round up to nearest (default: 1)
 * @returns {Object} - Summary object with total roundups and processed transactions
 */
function processTransactionRoundUps(transactions, roundUpTo = 1) {
    let totalRoundUps = new Decimal(0);
    const processedTransactions = [];
    
    for (const transaction of transactions) {
        try {
            const roundUpAmount = calculateRoundUp(transaction.amount, roundUpTo);
            
            processedTransactions.push({
                ...transaction,
                roundUpAmount: roundUpAmount,
                originalAmount: new Decimal(transaction.amount).toFixed(2),
                roundedAmount: new Decimal(transaction.amount).plus(roundUpAmount).toFixed(2)
            });
            
            totalRoundUps = totalRoundUps.plus(roundUpAmount);
        } catch (error) {
            console.error(`Error processing transaction ${transaction.id}:`, error.message);
            continue;
        }
    }
    
    return {
        totalRoundUps: totalRoundUps.toFixed(2),
        processedCount: processedTransactions.length,
        processedTransactions
    };
}

/**
 * Calculate savings projections for different time periods
 * @param {number|string} currentBalance - Current wallet balance
 * @param {number|string} monthlyContribution - Average monthly round-ups
 * @param {number|string} annualRate - Annual return rate
 * @returns {Object} - Projections for 1, 3, 5, and 10 years
 */
function calculateSavingsProjections(currentBalance, monthlyContribution, annualRate) {
    const projections = {};
    const periods = [1, 3, 5, 10];
    
    for (const years of periods) {
        const currentBalanceFV = calculateCompoundInterest(currentBalance, annualRate, 12, years);
        
        const monthlyRate = new Decimal(annualRate).dividedBy(12);
        const months = years * 12;
        
        const monthlyContrib = new Decimal(monthlyContribution);
        if (monthlyRate.equals(0)) {
            const contributionFV = monthlyContrib.times(months);
            projections[`year${years}`] = new Decimal(currentBalanceFV).plus(contributionFV).toFixed(2);
        } else {
            const factor = monthlyRate.plus(1).pow(months).minus(1).dividedBy(monthlyRate);
            const contributionFV = monthlyContrib.times(factor);
            projections[`year${years}`] = new Decimal(currentBalanceFV).plus(contributionFV).toFixed(2);
        }
    }
    
    return projections;
}

/**
 * Validate and parse monetary amount
 * @param {string|number} amount 
 * @returns {string} - Valid decimal string
 */
function validateAmount(amount) {
    try {
        const decimal = new Decimal(amount);
        if (decimal.isNaN() || decimal.isNegative()) {
            throw new Error('Amount must be a positive number');
        }
        return decimal.toFixed(2);
    } catch (error) {
        throw new Error(`Invalid amount: ${amount}`);
    }
}

module.exports = {
    calculateRoundUp,
    calculateCompoundInterest,
    processTransactionRoundUps,
    calculateSavingsProjections,
    validateAmount,
    // New time-weighted functions
    calculateTimeWeightedGrowth,
    generatePortfolioHistory,
    calculatePeriodGrowth
};