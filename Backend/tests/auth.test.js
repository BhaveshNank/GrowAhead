const request = require('supertest');
const express = require('express');
const { Pool } = require('pg');
const authRouter = require('../routes/auth');

// ─────────────────────────────────────────────
// Test app setup — mirrors how server.js wires
// up the database and routes, but points at the
// test database instead of the real one.
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

// ─────────────────────────────────────────────
// Cleanup — wipe users table before each test
// so tests never bleed into each other.
// ─────────────────────────────────────────────
beforeEach(async () => {
    await testPool.query('DELETE FROM email_verifications');
    await testPool.query('DELETE FROM wallet');
    await testPool.query('DELETE FROM roundups');
    await testPool.query('DELETE FROM transactions');
    await testPool.query('DELETE FROM users');
});

afterAll(async () => {
    await testPool.end();
});

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
describe('POST /api/auth/register', () => {

    test('missing name returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'test@example.com', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('missing email returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Test User', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('invalid email format returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Test User', email: 'not-an-email', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('password shorter than 6 characters returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Test User', email: 'test@example.com', password: '123' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('invalid risk profile returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Test User', email: 'test@example.com', password: 'password123', riskProfile: 'extreme' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('missing body returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
describe('POST /api/auth/login', () => {

    test('missing email returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('missing password returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('invalid email format returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'not-an-email', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    test('email that does not exist returns 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@example.com', password: 'password123' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid credentials');
    });

    test('unverified user gets 403 with action field', async () => {
        // Insert an unverified user directly into the test DB
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('password123', 10);
        await testPool.query(
            `INSERT INTO users (name, email, password_hash, email_verified)
             VALUES ('Test User', 'unverified@example.com', $1, FALSE)`,
            [hash]
        );

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'unverified@example.com', password: 'password123' });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Email not verified');
        expect(res.body.action).toBe('verify_email');
    });

    test('verified user with wrong password returns 401', async () => {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('correctpassword', 10);
        await testPool.query(
            `INSERT INTO users (name, email, password_hash, email_verified)
             VALUES ('Test User', 'verified@example.com', $1, TRUE)`,
            [hash]
        );

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'verified@example.com', password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid credentials');
    });

    test('verified user with correct password returns 200 with token', async () => {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('password123', 10);
        await testPool.query(
            `INSERT INTO users (name, email, password_hash, email_verified, risk_profile)
             VALUES ('Test User', 'verified@example.com', $1, TRUE, 'balanced')`,
            [hash]
        );

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'verified@example.com', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe('verified@example.com');
        expect(res.body.user.riskProfile).toBe('balanced');
    });

});

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
describe('GET /api/auth/me', () => {

    test('no token returns 401', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    test('invalid token returns 403', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer invalidtoken');
        expect(res.status).toBe(403);
    });

    test('valid token returns user data', async () => {
        // Insert verified user and log in to get a real token
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('password123', 10);
        await testPool.query(
            `INSERT INTO users (name, email, password_hash, email_verified, risk_profile)
             VALUES ('Test User', 'me@example.com', $1, TRUE, 'aggressive')`,
            [hash]
        );

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'me@example.com', password: 'password123' });

        const token = loginRes.body.token;

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('me@example.com');
        expect(res.body.user.riskProfile).toBe('aggressive');
        expect(res.body.user.emailVerified).toBe(true);
    });

});