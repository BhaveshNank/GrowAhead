const express = require('express');
const Joi = require('joi');
const { calculateCompoundInterest, calculateSavingsProjections } = require('../utils/roundup');

const router = express.Router();

// Import auth middleware
const { authenticateToken } = require('./auth');

// Get investment projections
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Get user's current wallet and risk profile
        const userQuery = `
            SELECT 
                u.risk_profile,
                w.total_balance,
                ip.annual_return_rate
            FROM users u
            JOIN wallet w ON u.id = w.user_id
            JOIN investment_profiles ip ON u.risk_profile = ip.profile_name
            WHERE u.id = $1
        `;

        const userResult = await req.db.query(userQuery, [req.user.userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User or wallet not found'
            });
        }

        const { risk_profile, total_balance, annual_return_rate } = userResult.rows[0];

        // Calculate average monthly contribution over last 6 months
        const avgContributionResult = await req.db.query(`
            SELECT COALESCE(AVG(monthly_roundup), 0) as avg_monthly
            FROM (
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    SUM(roundup_amount) as monthly_roundup
                FROM roundups 
                WHERE user_id = $1 
                    AND created_at >= NOW() - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', created_at)
            ) monthly_totals
        `, [req.user.userId]);

        const avgMonthlyContribution = avgContributionResult.rows[0].avg_monthly;

        // Calculate projections
        const projections = calculateSavingsProjections(
            total_balance,
            avgMonthlyContribution,
            annual_return_rate
        );

        // Get all available investment profiles for comparison
        const profilesResult = await req.db.query(
            'SELECT profile_name, annual_return_rate, description FROM investment_profiles ORDER BY annual_return_rate'
        );

        const comparisonProjections = {};
        for (const profile of profilesResult.rows) {
            comparisonProjections[profile.profile_name] = calculateSavingsProjections(
                total_balance,
                avgMonthlyContribution,
                profile.annual_return_rate
            );
        }

        res.json({
            currentProfile: {
                name: risk_profile,
                returnRate: parseFloat(annual_return_rate),
                currentBalance: parseFloat(total_balance),
                avgMonthlyContribution: parseFloat(avgMonthlyContribution)
            },
            projections: {
                oneYear: parseFloat(projections.year1),
                threeYears: parseFloat(projections.year3),
                fiveYears: parseFloat(projections.year5),
                tenYears: parseFloat(projections.year10)
            },
            comparisonProfiles: profilesResult.rows.map(profile => ({
                name: profile.profile_name,
                returnRate: parseFloat(profile.annual_return_rate),
                description: profile.description,
                projections: {
                    oneYear: parseFloat(comparisonProjections[profile.profile_name].year1),
                    threeYears: parseFloat(comparisonProjections[profile.profile_name].year3),
                    fiveYears: parseFloat(comparisonProjections[profile.profile_name].year5),
                    tenYears: parseFloat(comparisonProjections[profile.profile_name].year10)
                }
            }))
        });

    } catch (error) {
        console.error('Projections error:', error);
        res.status(500).json({
            error: 'Failed to calculate projections'
        });
    }
});

// Calculate custom projection
router.post('/custom', authenticateToken, async (req, res) => {
    try {
        const customSchema = Joi.object({
            currentBalance: Joi.number().min(0).required(),
            monthlyContribution: Joi.number().min(0).required(),
            annualReturnRate: Joi.number().min(0).max(1).required(), // 0 to 1 (0% to 100%)
            timeHorizonYears: Joi.number().min(0.1).max(50).required()
        });

        const { error, value } = customSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.details.map(d => d.message)
            });
        }

        const { currentBalance, monthlyContribution, annualReturnRate, timeHorizonYears } = value;

        // Calculate future value
        const futureValue = calculateSavingsProjections(
            currentBalance,
            monthlyContribution,
            annualReturnRate
        );

        // For custom time horizon, calculate specifically
        const monthlyRate = annualReturnRate / 12;
        const months = timeHorizonYears * 12;

        // Future value of current balance
        const currentBalanceFV = calculateCompoundInterest(
            currentBalance,
            annualReturnRate,
            12,
            timeHorizonYears
        );

        // Future value of monthly contributions (annuity)
        let contributionFV = 0;
        if (monthlyContribution > 0) {
            if (monthlyRate === 0) {
                contributionFV = monthlyContribution * months;
            } else {
                contributionFV = monthlyContribution * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
            }
        }

        const totalFutureValue = parseFloat(currentBalanceFV) + contributionFV;
        const totalContributions = currentBalance + (monthlyContribution * months);
        const totalGrowth = totalFutureValue - totalContributions;

        res.json({
            projection: {
                timeHorizonYears,
                currentBalance,
                monthlyContribution,
                annualReturnRate: annualReturnRate * 100, // Convert to percentage for display
                futureValue: totalFutureValue.toFixed(2),
                totalContributions: totalContributions.toFixed(2),
                totalGrowth: totalGrowth.toFixed(2),
                growthPercentage: totalContributions > 0 ? ((totalGrowth / totalContributions) * 100).toFixed(2) : '0.00'
            },
            breakdown: {
                fromCurrentBalance: parseFloat(currentBalanceFV),
                fromContributions: parseFloat(contributionFV.toFixed(2)),
                totalMonthlyContributions: (monthlyContribution * months).toFixed(2)
            }
        });

    } catch (error) {
        console.error('Custom projection error:', error);
        res.status(500).json({
            error: 'Failed to calculate custom projection'
        });
    }
});

// Get goal tracking data
router.get('/goals', authenticateToken, async (req, res) => {
    try {
        // Get current balance
        const walletResult = await req.db.query(
            'SELECT total_balance FROM wallet WHERE user_id = $1',
            [req.user.userId]
        );

        if (walletResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Wallet not found'
            });
        }

        const currentBalance = parseFloat(walletResult.rows[0].total_balance);

        // Get user's average monthly contribution
        const avgContributionResult = await req.db.query(`
            SELECT COALESCE(AVG(monthly_roundup), 0) as avg_monthly
            FROM (
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    SUM(roundup_amount) as monthly_roundup
                FROM roundups 
                WHERE user_id = $1 
                    AND created_at >= NOW() - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', created_at)
            ) monthly_totals
        `, [req.user.userId]);

        const avgMonthlyContribution = parseFloat(avgContributionResult.rows[0].avg_monthly);

        // Define common savings goals with time to reach
        const commonGoals = [
            { name: 'Emergency Fund', amount: 1000 },
            { name: 'Vacation Fund', amount: 2500 },
            { name: 'Car Down Payment', amount: 5000 },
            { name: 'Home Down Payment', amount: 20000 }
        ];

        const goalsWithTimeline = commonGoals.map(goal => {
            const remainingAmount = Math.max(0, goal.amount - currentBalance);
            const monthsToReach = avgMonthlyContribution > 0 
                ? Math.ceil(remainingAmount / avgMonthlyContribution)
                : null;

            return {
                ...goal,
                currentProgress: currentBalance,
                remainingAmount,
                progressPercentage: ((currentBalance / goal.amount) * 100).toFixed(1),
                monthsToReach,
                achieved: currentBalance >= goal.amount
            };
        });

        res.json({
            currentBalance,
            avgMonthlyContribution,
            goals: goalsWithTimeline
        });

    } catch (error) {
        console.error('Goals tracking error:', error);
        res.status(500).json({
            error: 'Failed to fetch goal tracking data'
        });
    }
});

// Calculate time to reach a specific goal
router.post('/goal-timeline', authenticateToken, async (req, res) => {
    try {
        const goalSchema = Joi.object({
            targetAmount: Joi.number().positive().required(),
            includeInterest: Joi.boolean().default(true)
        });

        const { error, value } = goalSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.details.map(d => d.message)
            });
        }

        const { targetAmount, includeInterest } = value;

        // Get current balance and user profile
        const userDataResult = await req.db.query(`
            SELECT 
                w.total_balance,
                u.risk_profile,
                ip.annual_return_rate
            FROM users u
            JOIN wallet w ON u.id = w.user_id
            JOIN investment_profiles ip ON u.risk_profile = ip.profile_name
            WHERE u.id = $1
        `, [req.user.userId]);

        const { total_balance, risk_profile, annual_return_rate } = userDataResult.rows[0];
        const currentBalance = parseFloat(total_balance);

        // Get average monthly contribution
        const avgContributionResult = await req.db.query(`
            SELECT COALESCE(AVG(monthly_roundup), 0) as avg_monthly
            FROM (
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    SUM(roundup_amount) as monthly_roundup
                FROM roundups 
                WHERE user_id = $1 
                    AND created_at >= NOW() - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', created_at)
            ) monthly_totals
        `, [req.user.userId]);

        const avgMonthlyContribution = parseFloat(avgContributionResult.rows[0].avg_monthly);

        if (currentBalance >= targetAmount) {
            return res.json({
                achieved: true,
                message: 'Goal already achieved!',
                currentBalance,
                targetAmount
            });
        }

        let monthsToReach;
        if (includeInterest && annual_return_rate > 0) {
            // Calculate with compound interest (more complex calculation)
            const monthlyRate = annual_return_rate / 12;
            
            if (avgMonthlyContribution > 0) {
                // Use logarithms to solve for time in compound interest formula
                // PV * (1+r)^n + PMT * [((1+r)^n - 1) / r] = FV
                // This is a complex equation, so we'll use approximation
                let months = 0;
                let balance = currentBalance;
                
                while (balance < targetAmount && months < 600) { // Cap at 50 years
                    balance = balance * (1 + monthlyRate) + avgMonthlyContribution;
                    months++;
                }
                
                monthsToReach = months < 600 ? months : null;
            } else {
                // No contributions, just compound current balance
                if (currentBalance > 0) {
                    monthsToReach = Math.log(targetAmount / currentBalance) / Math.log(1 + monthlyRate);
                    monthsToReach = Math.ceil(monthsToReach);
                } else {
                    monthsToReach = null;
                }
            }
        } else {
            // Simple calculation without interest
            const remainingAmount = targetAmount - currentBalance;
            monthsToReach = avgMonthlyContribution > 0 
                ? Math.ceil(remainingAmount / avgMonthlyContribution)
                : null;
        }

        res.json({
            achieved: false,
            targetAmount,
            currentBalance,
            remainingAmount: targetAmount - currentBalance,
            avgMonthlyContribution,
            monthsToReach,
            yearsToReach: monthsToReach ? (monthsToReach / 12).toFixed(1) : null,
            includeInterest,
            annualReturnRate: includeInterest ? annual_return_rate * 100 : 0
        });

    } catch (error) {
        console.error('Goal timeline error:', error);
        res.status(500).json({
            error: 'Failed to calculate goal timeline'
        });
    }
});

module.exports = router;