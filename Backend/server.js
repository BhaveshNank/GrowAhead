const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    // Add SSL configuration for AWS RDS
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err.stack);
        return;
    }
    console.log('Connected to PostgreSQL database');
    release();
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'https://growahead-beta.vercel.app',
            // Allow all Vercel preview URLs for your project
        ];
        
        // Check if origin matches allowed patterns
        if (allowedOrigins.includes(origin) || 
            origin.includes('bhavesh-nankanis-projects.vercel.app') ||
            origin.includes('growahead-') && origin.includes('.vercel.app')) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Make database pool available to routes
app.use((req, res, next) => {
    req.db = pool;
    next();
});

// DEBUGGING ENDPOINTS - These will tell us if your updated calculation code is working
app.get('/api/test-simple', (req, res) => {
    console.log('📍 Simple test endpoint called - server is working!');
    res.json({ 
        success: true,
        message: 'Server is responding perfectly!', 
        timestamp: new Date().toISOString(),
        note: 'This proves the server is working and not blocked by auth'
    });
});

// CALCULATION TEST - Direct import to test your updated time-weighted code
app.get('/api/test-calculation-direct', (req, res) => {
    try {
        console.log('🧪 TESTING UPDATED CALCULATION CODE DIRECTLY...');
        
        // Import your updated calculation function
        const { calculatePeriodGrowth } = require('./utils/roundup');
        
        // Test data mimicking your family transactions (September 1-22, 2025)
        const testRoundups = [
            { amount: 1.00, createdAt: '2025-09-01T10:00:00Z' }, // 22 days old
            { amount: 2.00, createdAt: '2025-09-15T10:00:00Z' }, // 8 days old  
            { amount: 3.00, createdAt: '2025-09-20T10:00:00Z' }, // 3 days old
            { amount: 15.16, createdAt: '2025-09-21T10:00:00Z' } // Recent (to match your $21.16 total)
        ];
        
        console.log('Testing with sample data spanning Sep 1-21...');
        
        // Test each period with your updated calculation
        const test7d = calculatePeriodGrowth(testRoundups, 0.05, '7d');
        const test30d = calculatePeriodGrowth(testRoundups, 0.05, '30d');
        const test90d = calculatePeriodGrowth(testRoundups, 0.05, '90d');
        
        console.log('7d result:', test7d.growthThisPeriod);
        console.log('30d result:', test30d.growthThisPeriod); 
        console.log('90d result:', test90d.growthThisPeriod);
        
        // Determine if the fix is working
        const isFixed = test30d.growthThisPeriod === 0 && test90d.growthThisPeriod === 0;
        
        res.json({
            status: isFixed ? '✅ FIXED' : '❌ STILL BROKEN',
            message: isFixed ? 
                'Your time-weighted calculation is working correctly!' :
                'Still using old calculation logic - check if utils/roundup.js was updated',
            testResults: {
                sevenDays: {
                    growthThisPeriod: test7d.growthThisPeriod,
                    addedThisPeriod: test7d.addedThisPeriod,
                    existingRoundupsCount: test7d.debug?.existingRoundupsCount || 'unknown',
                    expected: 'Small growth (~$0.01) since some roundups are older than 7 days'
                },
                thirtyDays: {
                    growthThisPeriod: test30d.growthThisPeriod,
                    addedThisPeriod: test30d.addedThisPeriod,
                    existingRoundupsCount: test30d.debug?.existingRoundupsCount || 'unknown',
                    expected: '$0.00 growth (no roundups existed 30 days ago)',
                    isCorrect: test30d.growthThisPeriod === 0
                },
                ninetyDays: {
                    growthThisPeriod: test90d.growthThisPeriod,
                    addedThisPeriod: test90d.addedThisPeriod,
                    existingRoundupsCount: test90d.debug?.existingRoundupsCount || 'unknown',
                    expected: '$0.00 growth (no roundups existed 90 days ago)',
                    isCorrect: test90d.growthThisPeriod === 0
                }
            },
            explanation: {
                problem: 'Your original dashboard showed impossible returns like +$21.19 growth',
                solution: 'Time-weighted calculation only grows roundups based on actual investment time',
                yourData: 'September 1-22 data means NO roundups existed 30+ days ago = NO growth possible'
            },
            nextSteps: isFixed ? [
                '1. Your calculation code is fixed!',
                '2. Clear browser cache (Ctrl+Shift+R)',
                '3. Check dashboard - should show realistic growth rates',
                '4. 30-day growth should be ~$0.00, not $21.19'
            ] : [
                '1. Check if Backend/utils/roundup.js contains the updated calculatePeriodGrowth function',
                '2. Restart the backend server completely',
                '3. Test this endpoint again'
            ],
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('ERROR in calculation test:', error);
        res.status(500).json({ 
            status: '💥 ERROR',
            error: error.message,
            stack: error.stack,
            message: 'Failed to test calculation - check if utils/roundup.js exists and has the updated function'
        });
    }
});

// ROOT ROUTE - Fix for AWS Load Balancer health checks
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK',
        service: 'GrowAhead Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        message: 'Welcome to GrowAhead Micro-Investment Platform',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            transactions: '/api/transactions',
            wallet: '/api/wallet'
        }
    });
});

app.get('/api/setup-database', async (req, res) => {
    try {
        console.log('Setting up COMPLETE database schema...');
        
        // Create users table with email verification support
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                risk_profile VARCHAR(20) DEFAULT 'balanced' CHECK (risk_profile IN ('conservative', 'balanced', 'aggressive')),
                email_verified BOOLEAN DEFAULT FALSE,
                verification_otp VARCHAR(10),
                otp_expires_at TIMESTAMP,
                otp_attempts INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create email verifications log table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS email_verifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                email VARCHAR(255) NOT NULL,
                otp_code VARCHAR(10) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                verified_at TIMESTAMP,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create transactions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                merchant VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                category VARCHAR(100),
                transaction_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create round-ups table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS roundups (
                id SERIAL PRIMARY KEY,
                transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                roundup_amount DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create wallet table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wallet (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                total_balance DECIMAL(10,2) DEFAULT 0.00,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create investment profiles table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS investment_profiles (
                id SERIAL PRIMARY KEY,
                profile_name VARCHAR(20) UNIQUE NOT NULL,
                annual_return_rate DECIMAL(5,4) NOT NULL,
                description TEXT
            )
        `);

        // Insert default investment profiles
        await pool.query(`
            INSERT INTO investment_profiles (profile_name, annual_return_rate, description) 
            VALUES 
                ('conservative', 0.0500, '5% annual return - Low risk with government bonds and fixed deposits'),
                ('balanced', 0.0800, '8% annual return - Medium risk with mix of stocks and bonds'),
                ('aggressive', 0.1200, '12% annual return - High risk with growth stocks and equity funds')
            ON CONFLICT (profile_name) DO NOTHING
        `);

        // Create indexes for better performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_roundups_user ON roundups(user_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_email_verifications_otp ON email_verifications(otp_code, expires_at)
        `);

        console.log('Complete database setup completed successfully');
        
        res.json({
            success: true,
            message: 'Complete database schema created successfully',
            tables: [
                'users', 
                'investment_profiles', 
                'email_verifications', 
                'wallet', 
                'transactions', 
                'roundups'
            ]
        });
        
    } catch (error) {
        console.error('Database setup error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/projections', require('./routes/projections'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        message: 'GrowAhead backend is running with time-weighted calculation fixes'
    });
});


// Email service debug endpoint - direct Gmail test
app.get('/api/debug-email', async (req, res) => {
    try {
        const nodemailer = require('nodemailer');
        
        console.log('🔍 Direct SendGrid connection test...');
        console.log('📧 Sender email:', process.env.SENDER_EMAIL);
        console.log('🔑 SendGrid API key set:', !!process.env.SENDGRID_API_KEY);
        console.log('🔑 API key first 20 chars:', process.env.SENDGRID_API_KEY?.substring(0, 20) + '...');
        
        // Create SendGrid transporter (same as emailService)
        const transporter = nodemailer.createTransport({
            service: 'SendGrid',  // Fixed: was 'gmail'
            auth: {
                user: 'apikey',   // Fixed: was process.env.EMAIL_USER
                pass: process.env.SENDGRID_API_KEY  // Fixed: was process.env.EMAIL_PASSWORD
            }
        });
        
        // Test connection directly - this will show the real error
        console.log('🔄 Testing SendGrid SMTP connection...');
        const result = await transporter.verify();
        
        console.log('✅ SendGrid connection successful!');
        res.json({
            success: true,
            sendGridConnected: true,
            credentials: {
                senderEmail: process.env.SENDER_EMAIL,
                apiKeySet: !!process.env.SENDGRID_API_KEY
            }
        });
        
    } catch (error) {
        // This will show the REAL SendGrid error
        console.error('🚨 REAL SendGrid Error:');
        console.error('- Message:', error.message);
        console.error('- Code:', error.code);
        console.error('- Command:', error.command);
        console.error('- Response:', error.response);
        
        res.status(500).json({
            success: false,
            sendGridConnected: false,
            sendGridError: {
                message: error.message,
                code: error.code,
                command: error.command,
                response: error.response
            },
            credentials: {
                senderEmail: process.env.SENDER_EMAIL,
                apiKeySet: !!process.env.SENDGRID_API_KEY
            }
        });
    }
});


// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Not Found', 
        message: 'The requested endpoint does not exist' 
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.details?.map(d => d.message) || [err.message]
        });
    }
    
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token'
        });
    }
    
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});

// Test email service endpoint
app.get('/api/test-email', (req, res) => {
    const emailService = require('./utils/emailService');
    
    emailService.testConnection().then(isReady => {
        res.json({
            emailServiceReady: isReady,
            timestamp: new Date().toISOString()
        });
    }).catch(error => {
        res.status(500).json({
            emailServiceReady: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🧪 Test your calculation fix: http://localhost:${PORT}/api/test-calculation-direct`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;