const express = require('express');
const { 
    calculateSavingsProjections, 
    calculateTimeWeightedGrowth,
    generatePortfolioHistory,
    calculatePeriodGrowth
} = require('../utils/roundup');
const { format, subDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth } = require('date-fns');

// Import auth middleware at the top
const { authenticateToken } = require('./auth');

const router = express.Router();

// Add this debug endpoint to wallet.js
router.get('/debug-data', authenticateToken, async (req, res) => {
    try {
        // Check roundups by month
        const monthlyResult = await req.db.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                COUNT(*) as roundup_count,
                SUM(roundup_amount) as total_roundups
            FROM roundups 
            WHERE user_id = $1
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month
        `, [req.user.userId]);

        // Check total transactions
        const transactionCount = await req.db.query(`
            SELECT COUNT(*) as total FROM transactions WHERE user_id = $1
        `, [req.user.userId]);

        res.json({
            monthlyBreakdown: monthlyResult.rows.map(row => ({
                month: row.month,
                roundupCount: parseInt(row.roundup_count),
                totalRoundups: parseFloat(row.total_roundups)
            })),
            totalTransactions: parseInt(transactionCount.rows[0].total),
            expectedTransactions: 543,
            message: "This shows what's actually in your database"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/test-calculation', async (req, res) => {
    try {
        console.log('🧪 Testing new calculation logic...');
        
        // Test with sample data similar to your family transactions
        const testRoundups = [
            { amount: 1.00, createdAt: '2025-09-01T10:00:00Z' }, // 22 days ago
            { amount: 2.00, createdAt: '2025-09-15T10:00:00Z' }, // 8 days ago  
            { amount: 3.00, createdAt: '2025-09-20T10:00:00Z' }  // 3 days ago
        ];
        
        // Test different periods
        const test7d = calculatePeriodGrowth(testRoundups, 0.05, '7d');
        const test30d = calculatePeriodGrowth(testRoundups, 0.05, '30d');
        
        res.json({
            message: 'Testing new time-weighted calculation logic',
            testData: {
                roundups: testRoundups,
                totalAmount: testRoundups.reduce((sum, r) => sum + r.amount, 0)
            },
            results: {
                sevenDays: test7d,
                thirtyDays: test30d
            },
            expectedResults: {
                sevenDays: {
                    growthThisPeriod: 'Should be ~$0.01 (only first roundup can grow)',
                    explanation: 'Only roundups older than 7 days contribute to growth'
                },
                thirtyDays: {
                    growthThisPeriod: 'Should be $0.00 (no roundups older than 30 days)',
                    explanation: 'No roundups existed 30 days ago'
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message, 
            stack: error.stack,
            message: 'Error in test calculation'
        });
    }
});


// Get wallet summary with proper time-weighted growth
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        // Get all roundups with creation dates for time-weighted calculation
        const roundupsResult = await req.db.query(`
            SELECT 
                roundup_amount as amount,
                created_at as "createdAt"
            FROM roundups 
            WHERE user_id = $1
            ORDER BY created_at ASC
        `, [req.user.userId]);

        const roundups = roundupsResult.rows;

        if (roundups.length === 0) {
            return res.json({
                wallet: {
                    totalBalance: 0,
                    lastUpdated: new Date()
                },
                summary: {
                    thisWeek: 0,
                    thisMonth: 0,
                    lastMonth: 0,
                    avgMonthlyContribution: 0,
                    monthlyGrowthRate: 0,
                    periodGrowth: 0
                },
                investment: {
                    riskProfile: 'balanced',
                    annualReturnRate: 0.08,
                    projections: {
                        oneYear: 0,
                        threeYears: 0,
                        fiveYears: 0,
                        tenYears: 0
                    }
                },
                debug: {
                    message: "No roundups found",
                    roundupCount: 0
                }
            });
        }

        // Get user's risk profile
        const userResult = await req.db.query(
            'SELECT risk_profile FROM users WHERE id = $1',
            [req.user.userId]
        );

        const riskProfile = userResult.rows[0].risk_profile;

        // Get investment profile details
        const profileResult = await req.db.query(
            'SELECT annual_return_rate FROM investment_profiles WHERE profile_name = $1',
            [riskProfile]
        );

        const annualReturnRate = parseFloat(profileResult.rows[0].annual_return_rate);

        // Calculate time-weighted growth for current portfolio
        const portfolioAnalysis = calculateTimeWeightedGrowth(roundups, annualReturnRate);

        // Calculate time-based summaries using proper date filtering
        const now = new Date();
        const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
        const startOfThisMonth = startOfMonth(now);

        // Get weekly roundups (contributions, not growth)
        const weeklyRoundups = roundups.filter(r => new Date(r.createdAt) >= startOfThisWeek);
        const thisWeekContributions = weeklyRoundups.reduce((sum, r) => sum + parseFloat(r.amount), 0);

        // Get monthly roundups (contributions, not growth)
        const monthlyRoundups = roundups.filter(r => new Date(r.createdAt) >= startOfThisMonth);
        const thisMonthContributions = monthlyRoundups.reduce((sum, r) => sum + parseFloat(r.amount), 0);

        // Calculate period growth using time-weighted method
        const monthlyGrowthAnalysis = calculatePeriodGrowth(roundups, annualReturnRate, '30d');

        // Calculate average monthly contribution for projections
        const monthsActive = Math.max(1, Math.ceil((now - new Date(roundups[0].createdAt)) / (1000 * 60 * 60 * 24 * 30)));
        const avgMonthlyContribution = parseFloat(portfolioAnalysis.totalPrincipal) / monthsActive;

        // Calculate future projections based on current balance and avg contribution
        const projections = calculateSavingsProjections(
            portfolioAnalysis.totalCurrentValue,
            avgMonthlyContribution,
            annualReturnRate
        );

        res.json({
            wallet: {
                totalBalance: parseFloat(portfolioAnalysis.totalCurrentValue),
                lastUpdated: now
            },
            summary: {
                thisWeek: parseFloat(thisWeekContributions.toFixed(2)),
                thisMonth: parseFloat(thisMonthContributions.toFixed(2)),
                avgMonthlyContribution: parseFloat(avgMonthlyContribution.toFixed(2)),
                monthlyGrowthRate: parseFloat(monthlyGrowthAnalysis.growthRate.toFixed(1)),
                periodGrowth: parseFloat(monthlyGrowthAnalysis.growthThisPeriod.toFixed(2))
            },
            investment: {
                riskProfile: riskProfile,
                annualReturnRate: annualReturnRate,
                projections: {
                    oneYear: parseFloat(projections.year1),
                    threeYears: parseFloat(projections.year3),
                    fiveYears: parseFloat(projections.year5),
                    tenYears: parseFloat(projections.year10)
                }
            },
            debug: {
                message: "Time-weighted growth calculation",
                totalPrincipal: portfolioAnalysis.totalPrincipal,
                totalGrowth: portfolioAnalysis.totalGrowth,
                overallGrowthRate: portfolioAnalysis.overallGrowthRate,
                roundupCount: roundups.length,
                monthsActive,
                calculationMethod: portfolioAnalysis.calculationInfo.method
            }
        });

    } catch (error) {
        console.error('Wallet summary error:', error);
        res.status(500).json({
            error: 'Failed to fetch wallet summary',
            message: error.message
        });
    }
});

// Get wallet balance history with proper time-weighted growth
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        // Get all roundups for this user
        const roundupsResult = await req.db.query(`
            SELECT 
                roundup_amount as amount,
                created_at as "createdAt"
            FROM roundups 
            WHERE user_id = $1
            ORDER BY created_at ASC
        `, [req.user.userId]);

        const roundups = roundupsResult.rows;

        if (roundups.length === 0) {
            return res.json({
                period,
                history: [],
                summary: {
                    currentBalance: 0,
                    totalContributions: 0,
                    totalGrowth: 0,
                    growthRate: 0,
                    avgDailyContribution: 0
                },
                investmentInfo: {
                    annualReturnRate: 0.05,
                    dailyReturnRate: 0.0001,
                    riskProfile: 'balanced'
                }
            });
        }

        // Get user's investment profile
        const userResult = await req.db.query(
            'SELECT risk_profile FROM users WHERE id = $1',
            [req.user.userId]
        );
        
        const profileResult = await req.db.query(
            'SELECT annual_return_rate FROM investment_profiles WHERE profile_name = $1',
            [userResult.rows[0].risk_profile]
        );
        
        const annualReturnRate = parseFloat(profileResult.rows[0].annual_return_rate);

        // Generate time-weighted portfolio history
        const history = generatePortfolioHistory(roundups, annualReturnRate, period);

        // Calculate period-specific metrics
        const periodAnalysis = calculatePeriodGrowth(roundups, annualReturnRate, period);
        const currentAnalysis = calculateTimeWeightedGrowth(roundups, annualReturnRate);

        // Calculate average daily contribution for the period
        const periodDays = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        }[period] || 30;

        const avgDailyContribution = parseFloat(currentAnalysis.totalPrincipal) / 
            Math.max(1, Math.ceil((new Date() - new Date(roundups[0].createdAt)) / (1000 * 60 * 60 * 24)));

        res.json({
            period,
            history,
            summary: {
                currentBalance: parseFloat(currentAnalysis.totalCurrentValue),
                totalContributions: parseFloat(currentAnalysis.totalPrincipal),
                totalGrowth: parseFloat(currentAnalysis.totalGrowth),
                growthRate: parseFloat(currentAnalysis.overallGrowthRate),
                addedThisPeriod: periodAnalysis.addedThisPeriod,
                growthThisPeriod: periodAnalysis.growthThisPeriod,
                avgDailyContribution: parseFloat(avgDailyContribution.toFixed(2))
            },
            investmentInfo: {
                annualReturnRate,
                dailyReturnRate: annualReturnRate / 365,
                riskProfile: userResult.rows[0].risk_profile
            },
            debug: {
                period,
                totalRoundups: roundups.length,
                firstRoundupDate: roundups[0].createdAt,
                calculationMethod: 'time-weighted-growth',
                periodDays,
                message: 'Compatible with frontend chart expectations'
            }
        });

    } catch (error) {
        console.error('Wallet history error:', error);
        res.status(500).json({
            error: 'Failed to fetch wallet history',
            message: error.message
        });
    }
});

// Fix missing roundups endpoint
router.post('/fix-missing-roundups', authenticateToken, async (req, res) => {
    try {
        console.log(`Fixing missing roundups for user ${req.user.userId}...`);

        // Get transactions without roundups
        const transactionsResult = await req.db.query(`
            SELECT 
                t.id,
                t.merchant,
                t.amount,
                t.transaction_date,
                t.created_at
            FROM transactions t
            LEFT JOIN roundups r ON t.id = r.transaction_id
            WHERE t.user_id = $1 
            AND r.id IS NULL 
            AND t.amount > 0
        `, [req.user.userId]);

        const transactions = transactionsResult.rows;
        
        if (transactions.length === 0) {
            return res.json({
                message: 'No missing roundups found',
                transactionsProcessed: 0,
                totalRoundupsCreated: 0,
                newWalletBalance: 0
            });
        }

        console.log(`Found ${transactions.length} transactions without roundups`);

        const client = await req.db.connect();
        
        try {
            await client.query('BEGIN');

            let processedCount = 0;
            let totalRoundups = 0;

            for (const transaction of transactions) {
                const amount = parseFloat(transaction.amount);
                const roundupAmount = Math.ceil(amount) - amount;
                
                if (roundupAmount > 0) {
                    // IMPORTANT: Use transaction date for roundup creation to enable historical analysis
                    await client.query(`
                        INSERT INTO roundups (transaction_id, user_id, roundup_amount, created_at)
                        VALUES ($1, $2, $3, $4)
                    `, [
                        transaction.id,
                        req.user.userId,
                        roundupAmount.toFixed(2),
                        transaction.transaction_date // Use transaction date, not NOW()
                    ]);

                    totalRoundups += roundupAmount;
                    processedCount++;
                    
                    console.log(`Created roundup: $${roundupAmount.toFixed(2)} for ${transaction.merchant} ($${amount}) on ${transaction.transaction_date}`);
                }
            }

            await client.query('COMMIT');

            // Calculate new wallet balance using time-weighted growth
            const roundupsResult = await req.db.query(`
                SELECT 
                    roundup_amount as amount,
                    created_at as "createdAt"
                FROM roundups 
                WHERE user_id = $1
                ORDER BY created_at ASC
            `, [req.user.userId]);

            const userResult = await req.db.query(
                'SELECT risk_profile FROM users WHERE id = $1',
                [req.user.userId]
            );

            const profileResult = await req.db.query(
                'SELECT annual_return_rate FROM investment_profiles WHERE profile_name = $1',
                [userResult.rows[0].risk_profile]
            );

            const annualReturnRate = parseFloat(profileResult.rows[0].annual_return_rate);
            const analysis = calculateTimeWeightedGrowth(roundupsResult.rows, annualReturnRate);

            console.log(`Roundups fix complete! Created ${processedCount} roundups totaling $${totalRoundups.toFixed(2)}`);

            res.json({
                message: 'Successfully fixed missing roundups with time-weighted growth',
                transactionsProcessed: processedCount,
                totalRoundupsCreated: parseFloat(totalRoundups.toFixed(2)),
                newWalletBalance: parseFloat(analysis.totalCurrentValue),
                details: {
                    totalTransactionsChecked: transactions.length,
                    roundupsAlreadyExisted: transactions.length - processedCount,
                    totalGrowth: analysis.totalGrowth,
                    growthRate: analysis.overallGrowthRate
                }
            });

        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Fix roundups error:', error);
        res.status(500).json({
            error: 'Failed to fix missing roundups',
            message: error.message
        });
    }
});

// Get recent roundups
router.get('/roundups', authenticateToken, async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const result = await req.db.query(`
            SELECT 
                r.roundup_amount,
                r.created_at,
                t.merchant,
                t.amount as original_amount,
                t.category,
                t.transaction_date
            FROM roundups r
            JOIN transactions t ON r.transaction_id = t.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2
        `, [req.user.userId, parseInt(limit)]);

        const roundups = result.rows.map(row => ({
            roundupAmount: parseFloat(row.roundup_amount),
            createdAt: row.created_at,
            transaction: {
                merchant: row.merchant,
                originalAmount: parseFloat(row.original_amount),
                category: row.category,
                date: row.transaction_date
            }
        }));

        res.json({
            roundups
        });

    } catch (error) {
        console.error('Recent roundups error:', error);
        res.status(500).json({
            error: 'Failed to fetch recent roundups'
        });
    }
});

// Get category breakdown
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const result = await req.db.query(`
            SELECT 
                COALESCE(t.category, 'Uncategorized') as category,
                COUNT(r.id) as transaction_count,
                SUM(r.roundup_amount) as total_roundups,
                AVG(r.roundup_amount) as avg_roundup
            FROM roundups r
            JOIN transactions t ON r.transaction_id = t.id
            WHERE r.user_id = $1
            GROUP BY COALESCE(t.category, 'Uncategorized')
            ORDER BY total_roundups DESC
        `, [req.user.userId]);

        const categories = result.rows.map(row => ({
            category: row.category,
            transactionCount: parseInt(row.transaction_count),
            totalRoundups: parseFloat(row.total_roundups),
            avgRoundup: parseFloat(row.avg_roundup)
        }));

        res.json({
            categories
        });

    } catch (error) {
        console.error('Category breakdown error:', error);
        res.status(500).json({
            error: 'Failed to fetch category breakdown'
        });
    }
});

// Get savings stats with time-weighted analysis
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        // Get basic stats
        const statsResult = await req.db.query(`
            SELECT 
                COUNT(DISTINCT t.id) as total_transactions,
                COUNT(r.id) as total_roundups,
                COALESCE(SUM(r.roundup_amount), 0) as total_saved,
                COALESCE(AVG(r.roundup_amount), 0) as avg_roundup,
                COALESCE(MAX(r.roundup_amount), 0) as max_roundup,
                MIN(r.created_at) as first_roundup_date
            FROM transactions t
            LEFT JOIN roundups r ON t.id = r.transaction_id
            WHERE t.user_id = $1
        `, [req.user.userId]);

        const stats = statsResult.rows[0];

        // Get time-weighted analysis
        const roundupsResult = await req.db.query(`
            SELECT 
                roundup_amount as amount,
                created_at as "createdAt"
            FROM roundups 
            WHERE user_id = $1
            ORDER BY created_at ASC
        `, [req.user.userId]);

        let timeWeightedAnalysis = null;
        if (roundupsResult.rows.length > 0) {
            const userResult = await req.db.query(
                'SELECT risk_profile FROM users WHERE id = $1',
                [req.user.userId]
            );

            const profileResult = await req.db.query(
                'SELECT annual_return_rate FROM investment_profiles WHERE profile_name = $1',
                [userResult.rows[0].risk_profile]
            );

            const annualReturnRate = parseFloat(profileResult.rows[0].annual_return_rate);
            timeWeightedAnalysis = calculateTimeWeightedGrowth(roundupsResult.rows, annualReturnRate);
        }

        // Get monthly savings trend
        const trendResult = await req.db.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                SUM(roundup_amount) as monthly_savings
            FROM roundups
            WHERE user_id = $1
                AND created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
        `, [req.user.userId]);

        const monthlyTrend = trendResult.rows.map(row => ({
            month: format(new Date(row.month), 'yyyy-MM'),
            savings: parseFloat(row.monthly_savings)
        }));

        res.json({
            stats: {
                totalTransactions: parseInt(stats.total_transactions),
                totalRoundups: parseInt(stats.total_roundups),
                totalSaved: parseFloat(stats.total_saved),
                avgRoundup: parseFloat(stats.avg_roundup),
                maxRoundup: parseFloat(stats.max_roundup),
                firstRoundupDate: stats.first_roundup_date
            },
            timeWeightedGrowth: timeWeightedAnalysis ? {
                currentValue: parseFloat(timeWeightedAnalysis.totalCurrentValue),
                totalGrowth: parseFloat(timeWeightedAnalysis.totalGrowth),
                growthRate: parseFloat(timeWeightedAnalysis.overallGrowthRate)
            } : null,
            monthlyTrend
        });

    } catch (error) {
        console.error('Wallet stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch wallet statistics'
        });
    }
});

module.exports = router;