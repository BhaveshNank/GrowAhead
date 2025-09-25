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
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000', 
        process.env.FRONTEND_URL
    ].filter(Boolean),
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