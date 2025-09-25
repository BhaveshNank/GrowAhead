const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const Joi = require('joi');
const { format, parseISO, isValid } = require('date-fns');
const { processTransactionRoundUps, validateAmount, calculateRoundUp } = require('../utils/roundup');

const router = express.Router();

// Import auth middleware
const { authenticateToken } = require('./auth');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

// Validation schema for manual transaction entry
const transactionSchema = Joi.object({
    merchant: Joi.string().min(1).max(255).required(),
    amount: Joi.number().positive().precision(2).required(),
    category: Joi.string().max(100).optional(),
    transactionDate: Joi.date().required()
});

// Get user's transactions
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 50, category, startDate, endDate } = req.query;
        
        // Build dynamic query
        let query = `
            SELECT t.*, r.roundup_amount 
            FROM transactions t 
            LEFT JOIN roundups r ON t.id = r.transaction_id 
            WHERE t.user_id = $1
        `;
        const params = [req.user.userId];
        let paramCount = 2;

        if (category) {
            query += ` AND t.category ILIKE $${paramCount}`;
            params.push(`%${category}%`);
            paramCount++;
        }

        if (startDate) {
            query += ` AND t.transaction_date >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }

        if (endDate) {
            query += ` AND t.transaction_date <= $${paramCount}`;
            params.push(endDate);
            paramCount++;
        }

        query += ` ORDER BY t.transaction_date DESC, t.id DESC`;
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const result = await req.db.query(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) FROM transactions WHERE user_id = $1';
        const countParams = [req.user.userId];
        
        const countResult = await req.db.query(countQuery, countParams);
        const totalTransactions = parseInt(countResult.rows[0].count);

        res.json({
            transactions: result.rows.map(row => ({
                id: row.id,
                merchant: row.merchant,
                amount: parseFloat(row.amount),
                category: row.category,
                transactionDate: row.transaction_date,
                roundupAmount: row.roundup_amount ? parseFloat(row.roundup_amount) : null,
                createdAt: row.created_at
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalTransactions / parseInt(limit)),
                totalTransactions
            }
        });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            error: 'Failed to fetch transactions'
        });
    }
});

// Upload CSV file and process transactions
router.post('/upload-csv', authenticateToken, upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select a CSV file to upload'
            });
        }

        const results = [];
        const errors = [];
        let lineNumber = 1; // Start from 1 (header row)

        // Create readable stream from buffer
        const stream = Readable.from(req.file.buffer.toString());

        // Parse CSV
        const parsePromise = new Promise((resolve, reject) => {
            stream
                .pipe(csvParser({
                    mapHeaders: ({ header }) => header.trim().toLowerCase(),
                    skipEmptyLines: true
                }))
                .on('data', (data) => {
                    lineNumber++;
                    try {
                        // Expected CSV columns: merchant, amount, category, date
                        const transaction = parseCsvRow(data, lineNumber);
                        if (transaction) {
                            results.push(transaction);
                        }
                    } catch (error) {
                        errors.push({
                            line: lineNumber,
                            error: error.message,
                            data: data
                        });
                    }
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', (error) => {
                    reject(error);
                });
        });

        await parsePromise;

        if (results.length === 0) {
            return res.status(400).json({
                error: 'No valid transactions found',
                message: 'The CSV file does not contain any valid transaction data',
                errors: errors
            });
        }

        // Begin database transaction
        const client = await req.db.connect();
        
        try {
            await client.query('BEGIN');

            // Insert transactions and roundups together (FIXED VERSION)
            let totalRoundups = 0;
            let totalRoundupAmount = 0;

            for (const transaction of results) {
                // Insert transaction
                const transactionResult = await client.query(
                    'INSERT INTO transactions (user_id, merchant, amount, category, transaction_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                    [req.user.userId, transaction.merchant, transaction.amount, transaction.category, transaction.transactionDate]
                );

                const insertedTransaction = transactionResult.rows[0];

                // Calculate roundup using backend logic (whole dollars = $1.00)
                const roundupAmount = Math.ceil(transaction.amount) === transaction.amount ? 1.00 : Math.ceil(transaction.amount) - transaction.amount;
                
                if (parseFloat(roundupAmount.toFixed(2)) > 0) {
                    // Insert roundup immediately with transaction date
                    await client.query(
                        'INSERT INTO roundups (transaction_id, user_id, roundup_amount, created_at) VALUES ($1, $2, $3, $4)',
                        [insertedTransaction.id, req.user.userId, roundupAmount.toFixed(2), transaction.transactionDate]
                    );
                    totalRoundups++;
                    totalRoundupAmount += parseFloat(roundupAmount.toFixed(2));
                }
            }

            await client.query('COMMIT');

            res.json({
                message: 'Transactions uploaded successfully',
                summary: {
                    totalProcessed: results.length,
                    totalRoundups: totalRoundups,
                    totalRoundupAmount: totalRoundupAmount.toFixed(2),
                    errors: errors.length
                },
                errors: errors.length > 0 ? errors : undefined
            });

        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('CSV upload error:', error);
        res.status(500).json({
            error: 'Failed to process CSV file',
            message: error.message
        });
    }
});

// Add single transaction manually
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { error, value } = transactionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.details.map(d => d.message)
            });
        }

        const { merchant, amount, category, transactionDate } = value;

        const client = await req.db.connect();
        
        try {
            await client.query('BEGIN');

            // Insert transaction
            const transactionResult = await client.query(
                'INSERT INTO transactions (user_id, merchant, amount, category, transaction_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [req.user.userId, merchant, amount, category, transactionDate]
            );

            const transaction = transactionResult.rows[0];

            // Calculate and insert roundup
            const roundupAmount = calculateRoundUp(amount);
            let roundup = null;

            if (parseFloat(roundupAmount) > 0) {
                const roundupResult = await client.query(
                    'INSERT INTO roundups (transaction_id, user_id, roundup_amount, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
                    [transaction.id, req.user.userId, roundupAmount, transactionDate]
                );
                roundup = roundupResult.rows[0];
            }

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Transaction added successfully',
                transaction: {
                    id: transaction.id,
                    merchant: transaction.merchant,
                    amount: parseFloat(transaction.amount),
                    category: transaction.category,
                    transactionDate: transaction.transaction_date,
                    roundupAmount: roundup ? parseFloat(roundup.roundup_amount) : 0,
                    createdAt: transaction.created_at
                }
            });

        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Add transaction error:', error);
        res.status(500).json({
            error: 'Failed to add transaction'
        });
    }
});

// Helper function to parse CSV row
function parseCsvRow(data, lineNumber) {
    // Expected columns: merchant, amount, category, date
    // Handle different possible column names
    const merchant = data.merchant || data.description || data.payee || data.name;
    const amount = data.amount || data.price || data.cost || data.value;
    const category = data.category || data.type || data.tag || '';
    const dateStr = data.date || data.transaction_date || data.transactiondate || data.datetime;

    if (!merchant) {
        throw new Error('Missing merchant/description column');
    }

    if (!amount) {
        throw new Error('Missing amount column');
    }

    if (!dateStr) {
        throw new Error('Missing date column');
    }

    // Validate and parse amount
    const parsedAmount = parseFloat(amount.toString().replace(/[^\d.-]/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error(`Invalid amount: ${amount}`);
    }

    // Parse date (try multiple formats)
    let transactionDate;
    try {
        // Try parsing as ISO date first
        transactionDate = parseISO(dateStr);
        if (!isValid(transactionDate)) {
            // Try parsing other common formats
            const dateFormats = ['yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'MM-dd-yyyy'];
            for (const formatStr of dateFormats) {
                try {
                    transactionDate = parseISO(dateStr);
                    if (isValid(transactionDate)) break;
                } catch (e) {
                    continue;
                }
            }
        }
        
        if (!isValid(transactionDate)) {
            throw new Error(`Invalid date format: ${dateStr}`);
        }
    } catch (error) {
        throw new Error(`Invalid date: ${dateStr}`);
    }

    return {
        merchant: merchant.toString().trim(),
        amount: parsedAmount,
        category: category.toString().trim() || null,
        transactionDate: format(transactionDate, 'yyyy-MM-dd')
    };
}


// Update/Edit individual transaction
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        const { error, value } = transactionSchema.validate(req.body);
        
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.details.map(d => d.message)
            });
        }

        const { merchant, amount, category, transactionDate } = value;

        const client = await req.db.connect();
        
        try {
            await client.query('BEGIN');

            // Check if transaction belongs to user
            const checkResult = await client.query(
                'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
                [transactionId, req.user.userId]
            );

            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    error: 'Transaction not found'
                });
            }

            const oldTransaction = checkResult.rows[0];

            // Update transaction
            const updateResult = await client.query(
                'UPDATE transactions SET merchant = $1, amount = $2, category = $3, transaction_date = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 RETURNING *',
                [merchant, amount, category, transactionDate, transactionId, req.user.userId]
            );

            const updatedTransaction = updateResult.rows[0];

            // Recalculate roundup if amount changed
            if (parseFloat(oldTransaction.amount) !== amount) {
                // Delete old roundup
                await client.query(
                    'DELETE FROM roundups WHERE transaction_id = $1',
                    [transactionId]
                );

                // Calculate new roundup
                const newRoundupAmount = calculateRoundUp(amount);
                let newRoundup = null;

                if (parseFloat(newRoundupAmount) > 0) {
                    const roundupResult = await client.query(
                        'INSERT INTO roundups (transaction_id, user_id, roundup_amount) VALUES ($1, $2, $3) RETURNING *',
                        [transactionId, req.user.userId, newRoundupAmount]
                    );
                    newRoundup = roundupResult.rows[0];
                }

                await client.query('COMMIT');

                res.json({
                    message: 'Transaction updated successfully',
                    transaction: {
                        id: updatedTransaction.id,
                        merchant: updatedTransaction.merchant,
                        amount: parseFloat(updatedTransaction.amount),
                        category: updatedTransaction.category,
                        transactionDate: updatedTransaction.transaction_date,
                        roundupAmount: newRoundup ? parseFloat(newRoundup.roundup_amount) : 0,
                        updatedAt: updatedTransaction.updated_at
                    }
                });
            } else {
                await client.query('COMMIT');

                // Get existing roundup
                const roundupResult = await client.query(
                    'SELECT * FROM roundups WHERE transaction_id = $1',
                    [transactionId]
                );

                res.json({
                    message: 'Transaction updated successfully',
                    transaction: {
                        id: updatedTransaction.id,
                        merchant: updatedTransaction.merchant,
                        amount: parseFloat(updatedTransaction.amount),
                        category: updatedTransaction.category,
                        transactionDate: updatedTransaction.transaction_date,
                        roundupAmount: roundupResult.rows[0] ? parseFloat(roundupResult.rows[0].roundup_amount) : 0,
                        updatedAt: updatedTransaction.updated_at
                    }
                });
            }

        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({
            error: 'Failed to update transaction'
        });
    }
});

// Delete individual transaction
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);

        const client = await req.db.connect();
        
        try {
            await client.query('BEGIN');

            // Check if transaction belongs to user
            const checkResult = await client.query(
                'SELECT t.*, r.roundup_amount FROM transactions t LEFT JOIN roundups r ON t.id = r.transaction_id WHERE t.id = $1 AND t.user_id = $2',
                [transactionId, req.user.userId]
            );

            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    error: 'Transaction not found'
                });
            }

            const transaction = checkResult.rows[0];

            // Delete roundup first (if exists)
            if (transaction.roundup_amount) {
                await client.query(
                    'DELETE FROM roundups WHERE transaction_id = $1',
                    [transactionId]
                );
            }

            // Delete transaction
            await client.query(
                'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
                [transactionId, req.user.userId]
            );

            await client.query('COMMIT');

            res.json({
                message: 'Transaction deleted successfully',
                deletedTransaction: {
                    id: transaction.id,
                    merchant: transaction.merchant,
                    amount: parseFloat(transaction.amount),
                    roundupAmount: transaction.roundup_amount ? parseFloat(transaction.roundup_amount) : 0
                }
            });

        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({
            error: 'Failed to delete transaction'
        });
    }
});

// Get single transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);

        const result = await req.db.query(
            'SELECT t.*, r.roundup_amount FROM transactions t LEFT JOIN roundups r ON t.id = r.transaction_id WHERE t.id = $1 AND t.user_id = $2',
            [transactionId, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Transaction not found'
            });
        }

        const transaction = result.rows[0];

        res.json({
            transaction: {
                id: transaction.id,
                merchant: transaction.merchant,
                amount: parseFloat(transaction.amount),
                category: transaction.category,
                transactionDate: transaction.transaction_date,
                roundupAmount: transaction.roundup_amount ? parseFloat(transaction.roundup_amount) : 0,
                createdAt: transaction.created_at,
                updatedAt: transaction.updated_at
            }
        });

    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({
            error: 'Failed to fetch transaction'
        });
    }
});

// Helper function to calculate round-up (imported from utils)


module.exports = router;