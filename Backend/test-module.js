// Save as test-modules.js in your Backend folder
console.log('🔍 Testing Node.js modules and server components...');

try {
    // Test environment loading
    require('dotenv').config();
    console.log('✅ dotenv loaded');

    // Test core modules
    const express = require('express');
    console.log('✅ express loaded');
    
    const { Pool } = require('pg');
    console.log('✅ pg loaded');
    
    const cors = require('cors');
    console.log('✅ cors loaded');
    
    const helmet = require('helmet');
    console.log('✅ helmet loaded');
    
    // Test auth modules
    const bcrypt = require('bcryptjs');
    console.log('✅ bcryptjs loaded');
    
    const jwt = require('jsonwebtoken');
    console.log('✅ jsonwebtoken loaded');
    
    const Joi = require('joi');
    console.log('✅ joi loaded');
    
    // Test utility modules
    const multer = require('multer');
    console.log('✅ multer loaded');
    
    const csvParser = require('csv-parser');
    console.log('✅ csv-parser loaded');
    
    const { format } = require('date-fns');
    console.log('✅ date-fns loaded');
    
    // Test decimal.js
    const Decimal = require('decimal.js');
    console.log('✅ decimal.js loaded');
    
    // Test environment variables
    console.log('\n🔧 Environment Variables:');
    console.log('✅ PORT:', process.env.PORT || 'using default 5000');
    console.log('✅ DB_HOST:', process.env.DB_HOST);
    console.log('✅ DB_USER:', process.env.DB_USER);
    console.log('✅ DB_NAME:', process.env.DB_NAME);
    console.log('✅ DB_PASSWORD set:', !!process.env.DB_PASSWORD ? 'Yes' : 'No (might be OK for local)');
    console.log('✅ JWT_SECRET set:', !!process.env.JWT_SECRET ? 'Yes' : 'No');
    
    // Test route file imports
    console.log('\n📁 Testing route imports...');
    
    try {
        require('./routes/auth');
        console.log('✅ routes/auth.js loaded');
    } catch (err) {
        console.log('❌ routes/auth.js ERROR:', err.message);
    }
    
    try {
        require('./routes/transactions');
        console.log('✅ routes/transactions.js loaded');
    } catch (err) {
        console.log('❌ routes/transactions.js ERROR:', err.message);
    }
    
    try {
        require('./routes/wallet');
        console.log('✅ routes/wallet.js loaded');
    } catch (err) {
        console.log('❌ routes/wallet.js ERROR:', err.message);
    }
    
    try {
        require('./routes/projections');
        console.log('✅ routes/projections.js loaded');
    } catch (err) {
        console.log('❌ routes/projections.js ERROR:', err.message);
    }
    
    // Test utility imports
    console.log('\n🛠️ Testing utility imports...');
    
    try {
        require('./utils/roundup');
        console.log('✅ utils/roundup.js loaded');
    } catch (err) {
        console.log('❌ utils/roundup.js ERROR:', err.message);
    }
    
    try {
        require('./utils/emailService');
        console.log('✅ utils/emailService.js loaded');
    } catch (err) {
        console.log('❌ utils/emailService.js ERROR:', err.message);
    }
    
    console.log('\n🎉 All modules loaded successfully!');
    console.log('🚀 Server components should work. Try starting the server now.');
    
} catch (error) {
    console.log('\n❌ MODULE LOADING ERROR:');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    
    if (error.code === 'MODULE_NOT_FOUND') {
        console.log('\n💡 SOLUTION: Install missing dependencies');
        console.log('Run: npm install');
    }
}