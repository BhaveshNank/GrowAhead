// tests/setup.js
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Create test database pool
const testPool = new Pool({
    user: process.env.TEST_DB_USER || process.env.DB_USER,
    host: process.env.TEST_DB_HOST || process.env.DB_HOST,
    database: process.env.TEST_DB_NAME || 'growahead_test',
    password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD,
    port: process.env.TEST_DB_PORT || process.env.DB_PORT || 5432,
});

// Set test environment
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(async () => {
    // Wait for database connection
    try {
        await testPool.connect();
        console.log('Connected to test database');
    } catch (error) {
        console.error('Failed to connect to test database:', error);
        process.exit(1);
    }
});

// Clean up after all tests
afterAll(async () => {
    await testPool.end();
});

// Clean database before each test
beforeEach(async () => {
    try {
        // Disable foreign key constraints temporarily
        await testPool.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // Clean all tables (adjust table names based on your schema)
        await testPool.query('DELETE FROM transactions');
        await testPool.query('DELETE FROM users');
        await testPool.query('DELETE FROM wallets');
        
        // Re-enable foreign key constraints
        await testPool.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (error) {
        // For PostgreSQL, use this approach instead
        try {
            await testPool.query('TRUNCATE TABLE transactions, users, wallets RESTART IDENTITY CASCADE');
        } catch (truncateError) {
            console.warn('Could not clean test database:', truncateError.message);
        }
    }
});

// Make test pool available globally
global.testDb = testPool;

// Helper function for creating test users
global.createTestUser = async (userData = {}) => {
    const defaultUser = {
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User',
        riskProfile: 'balanced'
    };

    const user = { ...defaultUser, ...userData };
    
    const result = await testPool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, risk_profile) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [user.email, user.password, user.firstName, user.lastName, user.riskProfile]
    );
    
    return result.rows[0];
};

// Helper function for creating test transactions
global.createTestTransaction = async (transactionData = {}, userId = null) => {
    const defaultTransaction = {
        merchant: 'Test Merchant',
        amount: 10.50,
        category: 'Food & Drink',
        date: new Date().toISOString().split('T')[0]
    };

    const transaction = { ...defaultTransaction, ...transactionData };
    
    // If no userId provided, create a test user
    if (!userId) {
        const testUser = await createTestUser();
        userId = testUser.id;
    }
    
    const result = await testPool.query(
        'INSERT INTO transactions (user_id, merchant, amount, category, date, round_up) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [userId, transaction.merchant, transaction.amount, transaction.category, transaction.date, 0.50] // Placeholder roundup
    );
    
    return result.rows[0];
};