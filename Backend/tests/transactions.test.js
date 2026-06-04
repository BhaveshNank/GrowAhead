const request = require('supertest');
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const authRouter = require('../routes/auth');
const transactionsRouter = require('../routes/transactions');

// ─────────────────────────────────────────────
// Test app — mirrors server.js wiring but
// points at growahead_test database.
// ─────────────────────────────────────────────
const testPool = new Pool({
    user: 'bhaveshnankani',
    host: 'localhost',
    database: 'growahead_test',
    password: null,
    port: 5432,
});

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    req.db = testPool;
    next();
});
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionsRouter);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// Creates a verified user and returns their JWT token
async function createVerifiedUser(email = 'test@example.com', password = 'password123') {
    const hash = await bcrypt.hash(password, 10);
    await testPool.query(
        `INSERT INTO users (name, email, password_hash, email_verified, risk_profile)
         VALUES ('Test User', $1, $2, TRUE, 'balanced')`,
        [email, hash]
    );
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
    return res.body.token;
}

// ─────────────────────────────────────────────
// Cleanup before each test
// ─────────────────────────────────────────────
beforeEach(async () => {
    await testPool.query('DELETE FROM email_verifications');
    await testPool.query('DELETE FROM roundups');
    await testPool.query('DELETE FROM wallet');
    await testPool.query('DELETE FROM transactions');
    await testPool.query('DELETE FROM users');
});

afterAll(async () => {
    await testPool.end();
});

// ─────────────────────────────────────────────
// GET /api/transactions
// ─────────────────────────────────────────────
describe('GET /api/transactions', () => {

    test('no token returns 401', async () => {
        const res = await request(app).get('/api/transactions');
        expect(res.status).toBe(401);
    });

    test('invalid token returns 403', async () => {
        const res = await request(app)
            .get('/api/transactions')
            .set('Authorization', 'Bearer badtoken');
        expect(res.status).toBe(403);
    });

    test('valid token with no transactions returns empty array', async () => {
        const token = await createVerifiedUser();
        const res = await request(app)
            .get('/api/transactions')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.transactions).toEqual([]);
        expect(res.body.pagination.totalTransactions).toBe(0);
    });

    test('returns only the authenticated user\'s transactions', async () => {
        const token1 = await createVerifiedUser('user1@example.com');
        const token2 = await createVerifiedUser('user2@example.com');

        // Add a transaction for user1
        await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token1}`)
            .send({ merchant: 'Starbucks', amount: 4.32, category: 'Food & Drink', transactionDate: '2026-01-01' });

        // User2 should see no transactions
        const res = await request(app)
            .get('/api/transactions')
            .set('Authorization', `Bearer ${token2}`);

        expect(res.status).toBe(200);
        expect(res.body.transactions).toHaveLength(0);
    });

});

// ─────────────────────────────────────────────
// POST /api/transactions (manual entry)
// ─────────────────────────────────────────────
describe('POST /api/transactions', () => {

    test('no token returns 401', async () => {
        const res = await request(app)
            .post('/api/transactions')
            .send({ merchant: 'Starbucks', amount: 4.32, transactionDate: '2026-01-01' });
        expect(res.status).toBe(401);
    });

    test('missing merchant returns 400', async () => {
        const token = await createVerifiedUser();
        const res = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({ amount: 4.32, transactionDate: '2026-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('missing amount returns 400', async () => {
        const token = await createVerifiedUser();
        const res = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({ merchant: 'Starbucks', transactionDate: '2026-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('negative amount returns 400', async () => {
        const token = await createVerifiedUser();
        const res = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({ merchant: 'Starbucks', amount: -5.00, transactionDate: '2026-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('missing transactionDate returns 400', async () => {
        const token = await createVerifiedUser();
        const res = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({ merchant: 'Starbucks', amount: 4.32 });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('valid transaction returns 201 with correct roundup', async () => {
        const token = await createVerifiedUser();
        const res = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({ merchant: 'Starbucks', amount: 4.32, category: 'Food & Drink', transactionDate: '2026-01-01' });

        expect(res.status).toBe(201);
        expect(res.body.transaction.merchant).toBe('Starbucks');
        expect(res.body.transaction.amount).toBe(4.32);
        // 4.32 → rounds to 5.00 → roundup = 0.68
        expect(res.body.transaction.roundupAmount).toBe(0.68);
    });

    test('whole dollar amount generates £1.00 roundup', async () => {
        const token = await createVerifiedUser();
        const res = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({ merchant: 'Netflix', amount: 15.00, category: 'Entertainment', transactionDate: '2026-01-01' });

        expect(res.status).toBe(201);
        expect(res.body.transaction.roundupAmount).toBe(1.00);
    });

    test('transaction appears in GET after being added', async () => {
        const token = await createVerifiedUser();

        await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({ merchant: 'Tesco', amount: 23.45, category: 'Groceries', transactionDate: '2026-01-01' });

        const res = await request(app)
            .get('/api/transactions')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.transactions).toHaveLength(1);
        expect(res.body.transactions[0].merchant).toBe('Tesco');
    });

});

// ─────────────────────────────────────────────
// POST /api/transactions/upload-csv
// ─────────────────────────────────────────────
describe('POST /api/transactions/upload-csv', () => {

    test('no token returns 401', async () => {
        const res = await request(app)
            .post('/api/transactions/upload-csv');
        expect(res.status).toBe(401);
    });

    test('no file returns 400', async () => {
        const token = await createVerifiedUser();
        const res = await request(app)
            .post('/api/transactions/upload-csv')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('No file uploaded');
    });

    test('valid CSV uploads and returns correct summary', async () => {
        const token = await createVerifiedUser();
        const csv = `merchant,amount,category,date\nStarbucks,4.32,Food & Drink,2026-01-01\nTesco,23.45,Groceries,2026-01-02\nNetflix,15.00,Entertainment,2026-01-03`;

        const res = await request(app)
            .post('/api/transactions/upload-csv')
            .set('Authorization', `Bearer ${token}`)
            .attach('csvFile', Buffer.from(csv), 'transactions.csv');

        expect(res.status).toBe(200);
        expect(res.body.summary.totalProcessed).toBe(3);
        expect(res.body.summary.totalRoundups).toBe(3);
        // 0.68 + 0.55 + 1.00 = 2.23
        expect(res.body.summary.totalRoundupAmount).toBe('2.23');
    });

    test('CSV with invalid amount skips the bad row', async () => {
        const token = await createVerifiedUser();
        const csv = `merchant,amount,category,date\nStarbucks,4.32,Food & Drink,2026-01-01\nBadRow,notanumber,Shopping,2026-01-02`;

        const res = await request(app)
            .post('/api/transactions/upload-csv')
            .set('Authorization', `Bearer ${token}`)
            .attach('csvFile', Buffer.from(csv), 'transactions.csv');

        // 1 valid row still processes successfully
        expect(res.status).toBe(200);
        expect(res.body.summary.totalProcessed).toBe(1);
    });

    test('CSV with all invalid rows returns 400', async () => {
        const token = await createVerifiedUser();
        const csv = `merchant,amount,category,date\nBadRow,notanumber,Shopping,2026-01-02`;

        const res = await request(app)
            .post('/api/transactions/upload-csv')
            .set('Authorization', `Bearer ${token}`)
            .attach('csvFile', Buffer.from(csv), 'transactions.csv');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('No valid transactions found');
    });

});

// ─────────────────────────────────────────────
// DELETE /api/transactions/:id
// ─────────────────────────────────────────────
describe('DELETE /api/transactions/:id', () => {

    test('deleting another user\'s transaction returns 404', async () => {
        const token1 = await createVerifiedUser('user1@example.com');
        const token2 = await createVerifiedUser('user2@example.com');

        // user1 adds a transaction
        const postRes = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token1}`)
            .send({ merchant: 'Starbucks', amount: 4.32, transactionDate: '2026-01-01' });

        const transactionId = postRes.body.transaction.id;

        // user2 tries to delete it
        const res = await request(app)
            .delete(`/api/transactions/${transactionId}`)
            .set('Authorization', `Bearer ${token2}`);

        expect(res.status).toBe(404);
    });

    test('deleting own transaction returns 200 and removes it', async () => {
        const token = await createVerifiedUser();

        const postRes = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({ merchant: 'Starbucks', amount: 4.32, transactionDate: '2026-01-01' });

        const transactionId = postRes.body.transaction.id;

        const deleteRes = await request(app)
            .delete(`/api/transactions/${transactionId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.status).toBe(200);

        // Confirm it's gone
        const getRes = await request(app)
            .get('/api/transactions')
            .set('Authorization', `Bearer ${token}`);

        expect(getRes.body.transactions).toHaveLength(0);
    });

});