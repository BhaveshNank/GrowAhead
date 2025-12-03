// Backend/routes/auth.js - Complete Working Version
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const emailService = require('../utils/emailService');

const router = express.Router();

// Rate limiting for OTP requests
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Maximum 5 OTP requests per IP per 15 minutes
    message: {
        error: 'Too many OTP requests',
        message: 'Please wait before requesting another verification code'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Validation schemas
const registerSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required(),
    riskProfile: Joi.string().valid('conservative', 'balanced', 'aggressive').default('balanced')
});

const verifyOTPSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Authentication middleware function - MUST be defined before routes use it
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            error: 'Access denied',
            message: 'No token provided'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                error: 'Invalid token',
                message: 'Token is invalid or expired'
            });
        }
        req.user = user;
        next();
    });
}

// STEP 1: Register user (creates unverified account)
router.post('/register', async (req, res) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.details.map(d => d.message)
            });
        }

        const { name, email, password, riskProfile } = value;

        // Check if user already exists
        const existingUser = await req.db.query(
            'SELECT id, email_verified FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            const user = existingUser.rows[0];
            if (user.email_verified) {
                return res.status(409).json({
                    error: 'User already exists',
                    message: 'An account with this email address is already verified'
                });
            } else {
                // User exists but not verified - allow re-registration
                await req.db.query('DELETE FROM users WHERE id = $1', [user.id]);
            }
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Generate OTP
        const otp = emailService.generateOTP();
        const otpExpiry = emailService.getOTPExpiry();

        // Insert new user (unverified)
        const result = await req.db.query(
            `INSERT INTO users (name, email, password_hash, risk_profile, email_verified, verification_otp, otp_expires_at, otp_attempts) 
             VALUES ($1, $2, $3, $4, FALSE, $5, $6, 0) 
             RETURNING id, name, email, risk_profile, created_at`,
            [name, email, hashedPassword, riskProfile, otp, otpExpiry]
        );

        const newUser = result.rows[0];

        // Log verification attempt
        await req.db.query(
            `INSERT INTO email_verifications (user_id, email, otp_code, expires_at, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [newUser.id, email, otp, otpExpiry, req.ip, req.get('User-Agent')]
        );

        // Send verification email
        try {
            await emailService.sendVerificationOTP(email, name, otp);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Delete user if email fails to send
            await req.db.query('DELETE FROM users WHERE id = $1', [newUser.id]);
            return res.status(500).json({
                error: 'Email delivery failed',
                message: 'Unable to send verification email. Please try again.'
            });
        }

        res.status(201).json({
            message: 'Registration initiated successfully',
            data: {
                userId: newUser.id,
                email: newUser.email,
                name: newUser.name,
                emailVerified: false,
                nextStep: 'verify_email'
            },
            instructions: 'Please check your email for a 6-digit verification code'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            message: 'An error occurred while creating your account'
        });
    }
});

// STEP 2: Verify email with OTP
router.post('/verify-email', async (req, res) => {
    try {
        const { error, value } = verifyOTPSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.details.map(d => d.message)
            });
        }

        const { email, otp } = value;

        // Find user with matching email and OTP
        const userResult = await req.db.query(
            `SELECT id, name, email, verification_otp, otp_expires_at, otp_attempts, email_verified
             FROM users 
             WHERE email = $1 AND verification_otp = $2`,
            [email, otp]
        );

        if (userResult.rows.length === 0) {
            // Increment attempts for security logging
            await req.db.query(
                'UPDATE users SET otp_attempts = otp_attempts + 1 WHERE email = $1',
                [email]
            );
            
            return res.status(400).json({
                error: 'Invalid verification code',
                message: 'The verification code is incorrect or expired'
            });
        }

        const user = userResult.rows[0];

        // Check if already verified
        if (user.email_verified) {
            return res.status(400).json({
                error: 'Already verified',
                message: 'This email address is already verified'
            });
        }

        // Check if OTP has expired
        if (new Date() > new Date(user.otp_expires_at)) {
            return res.status(400).json({
                error: 'Verification code expired',
                message: 'Please request a new verification code'
            });
        }

        // Check attempt limits (security measure)
        if (user.otp_attempts >= 5) {
            return res.status(429).json({
                error: 'Too many attempts',
                message: 'Maximum verification attempts exceeded. Please request a new code.'
            });
        }

        // Mark user as verified and clear OTP data
        await req.db.query(
            `UPDATE users 
             SET email_verified = TRUE, 
                 verification_otp = NULL, 
                 otp_expires_at = NULL, 
                 otp_attempts = 0,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [user.id]
        );

        // Update verification log
        await req.db.query(
            `UPDATE email_verifications 
             SET verified_at = CURRENT_TIMESTAMP 
             WHERE user_id = $1 AND otp_code = $2`,
            [user.id, otp]
        );

        // Create initial wallet entry
        await req.db.query(
            'INSERT INTO wallet (user_id, total_balance) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
            [user.id, 0.00]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Send welcome email (non-blocking)
        emailService.sendWelcomeEmail(user.email, user.name).catch(err => {
            console.error('Welcome email failed:', err);
        });

        res.json({
            message: 'Email verified successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                emailVerified: true,
                riskProfile: 'balanced' // Default for new users
            }
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            error: 'Verification failed',
            message: 'An error occurred during email verification'
        });
    }
});

// Resend verification OTP
router.post('/resend-verification', otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email required',
                message: 'Please provide an email address'
            });
        }

        // Find unverified user
        const userResult = await req.db.query(
            'SELECT id, name, email, email_verified FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'No account found with this email address'
            });
        }

        const user = userResult.rows[0];

        if (user.email_verified) {
            return res.status(400).json({
                error: 'Already verified',
                message: 'This email address is already verified'
            });
        }

        // Generate new OTP
        const otp = emailService.generateOTP();
        const otpExpiry = emailService.getOTPExpiry();

        // Update user with new OTP
        await req.db.query(
            `UPDATE users 
             SET verification_otp = $1, otp_expires_at = $2, otp_attempts = 0
             WHERE id = $3`,
            [otp, otpExpiry, user.id]
        );

        // Log new verification attempt
        await req.db.query(
            `INSERT INTO email_verifications (user_id, email, otp_code, expires_at, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.id, email, otp, otpExpiry, req.ip, req.get('User-Agent')]
        );

        // Send new verification email
        await emailService.sendVerificationOTP(email, user.name, otp);

        res.json({
            message: 'Verification code sent successfully',
            instructions: 'Please check your email for a new 6-digit verification code'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            error: 'Failed to resend verification',
            message: 'An error occurred while sending the verification code'
        });
    }
});

// Updated login with email verification check
router.post('/login', async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.details.map(d => d.message)
            });
        }

        const { email, password } = value;

        // Find user by email
        const result = await req.db.query(
            'SELECT id, name, email, password_hash, risk_profile, email_verified FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        const user = result.rows[0];

        // Check email verification
        if (!user.email_verified) {
            return res.status(403).json({
                error: 'Email not verified',
                message: 'Please verify your email address before logging in',
                action: 'verify_email',
                email: user.email
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                emailVerified: user.email_verified,
                riskProfile: user.risk_profile
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: 'An error occurred while logging in'
        });
    }
});

// GET current user information
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await req.db.query(
            'SELECT id, name, email, risk_profile, email_verified, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account no longer exists'
            });
        }

        const user = result.rows[0];

        if (!user.email_verified) {
            return res.status(403).json({
                error: 'Email not verified',
                message: 'Please verify your email address',
                action: 'verify_email',
                email: user.email
            });
        }

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                emailVerified: user.email_verified,
                riskProfile: user.risk_profile,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            error: 'Failed to get user information',
            message: 'An error occurred while retrieving user data'
        });
    }
});

// PUT /auth/profile - Update user profile (name and/or risk profile with recalculation)
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, riskProfile } = req.body;

        console.log('📝 Profile update request for user:', userId);

        // Validation
        const profileSchema = Joi.object({
            name: Joi.string().min(2).max(100).optional(),
            riskProfile: Joi.string().valid('conservative', 'balanced', 'aggressive').optional()
        }).min(1); // At least one field required

        const { error } = profileSchema.validate({ name, riskProfile });
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.details.map(d => d.message)
            });
        }

        // Get current user data
        const userResult = await req.db.query(
            'SELECT id, name, email, risk_profile, email_verified, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account not found'
            });
        }

        const currentUser = userResult.rows[0];
        const oldRiskProfile = currentUser.risk_profile;

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = ${paramCount}`);
            values.push(name);
            paramCount++;
        }

        if (riskProfile !== undefined) {
            updates.push(`risk_profile = ${paramCount}`);
            values.push(riskProfile);
            paramCount++;
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(userId);

        // Update user profile
        const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ${paramCount} RETURNING id, name, email, risk_profile, email_verified, created_at`;
        const updateResult = await req.db.query(updateQuery, values);

        const updatedUser = updateResult.rows[0];

        // If risk profile changed, recalculate ALL roundup growth
        let recalculationInfo = null;
        if (riskProfile && riskProfile !== oldRiskProfile) {
            console.log(`📊 Risk profile changed from ${oldRiskProfile} to ${riskProfile} - recalculating portfolio...`);

            // Get growth rate mapping
            const rateMap = {
                'conservative': 0.05,  // 5% annual
                'balanced': 0.08,      // 8% annual
                'aggressive': 0.12     // 12% annual
            };

            const newAnnualRate = rateMap[riskProfile];
            const dailyRate = newAnnualRate / 365;

            // Get all roundups for this user
            const roundupsResult = await req.db.query(
                `SELECT r.id, r.roundup_amount, r.created_at, t.transaction_date
                 FROM roundups r
                 JOIN transactions t ON r.transaction_id = t.id
                 WHERE r.user_id = $1`,
                [userId]
            );

            const roundups = roundupsResult.rows;
            let totalOldValue = 0;
            let totalNewValue = 0;

            // Recalculate each roundup
            for (const roundup of roundups) {
                const investmentDate = new Date(roundup.transaction_date || roundup.created_at);
                const currentDate = new Date();
                const daysInvested = Math.floor((currentDate - investmentDate) / (1000 * 60 * 60 * 24));

                // Old value (read from database before update)
                const oldValueResult = await req.db.query(
                    'SELECT current_value FROM roundups WHERE id = $1',
                    [roundup.id]
                );
                const oldValue = oldValueResult.rows[0]?.current_value || parseFloat(roundup.roundup_amount);
                totalOldValue += oldValue;

                // Calculate new value with new rate
                const principal = parseFloat(roundup.roundup_amount);
                const newValue = principal * Math.pow(1 + dailyRate, daysInvested);
                totalNewValue += newValue;

                // Update roundup with new current_value
                await req.db.query(
                    'UPDATE roundups SET current_value = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    [newValue.toFixed(2), roundup.id]
                );
            }

            // Update wallet total balance
            await req.db.query(
                'UPDATE wallet SET total_balance = $1, last_updated = CURRENT_TIMESTAMP WHERE user_id = $2',
                [totalNewValue.toFixed(2), userId]
            );

            recalculationInfo = {
                roundupsRecalculated: roundups.length,
                oldTotalValue: totalOldValue.toFixed(2),
                newTotalValue: totalNewValue.toFixed(2),
                difference: (totalNewValue - totalOldValue).toFixed(2),
                oldRiskProfile: oldRiskProfile,
                newRiskProfile: riskProfile
            };

            console.log(`📊 Portfolio recalculation complete:`, recalculationInfo);
        }

        res.json({
            success: true,
            message: riskProfile && riskProfile !== oldRiskProfile 
                ? 'Profile updated and portfolio recalculated successfully'
                : 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                emailVerified: updatedUser.email_verified,
                riskProfile: updatedUser.risk_profile,
                createdAt: updatedUser.created_at
            },
            recalculation: recalculationInfo
        });

    } catch (error) {
        console.error('📝 Profile update error:', error);
        res.status(500).json({
            error: 'Profile update failed',
            message: 'An error occurred while updating your profile: ' + error.message
        });
    }
});

// PUT /auth/password - Change password
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        console.log('🔐 Password change request for user:', userId);

        // Validate input
        const passwordSchema = Joi.object({
            currentPassword: Joi.string().required(),
            newPassword: Joi.string().min(6).max(100).required()
        });

        const { error } = passwordSchema.validate({ currentPassword, newPassword });
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.details.map(d => d.message)
            });
        }

        // Get current user and password hash
        const userResult = await req.db.query(
            'SELECT id, email, password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account not found'
            });
        }

        const user = userResult.rows[0];
        console.log('🔐 Found user:', user.email);

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            console.log('🔐 Invalid current password provided');
            return res.status(401).json({
                error: 'Invalid current password',
                message: 'Current password is incorrect'
            });
        }

        console.log('🔐 Current password verified, updating...');

        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password in database
        const updateResult = await req.db.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
            [hashedNewPassword, userId]
        );

        if (updateResult.rows.length === 0) {
            throw new Error('Password update failed - user not found');
        }

        console.log('🔐 Password updated successfully');

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('🔐 Password change error:', error);
        res.status(500).json({
            error: 'Password change failed',
            message: 'An error occurred while changing your password: ' + error.message
        });
    }
});

// DELETE /auth/account - Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { password } = req.body;

        console.log('🗑️ Account deletion request for user:', userId);

        if (!password) {
            return res.status(400).json({
                error: 'Password required',
                message: 'Please provide your password to confirm account deletion'
            });
        }

        // Get user and verify password
        const userResult = await req.db.query(
            'SELECT id, email, password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account not found'
            });
        }

        const user = userResult.rows[0];
        console.log('🗑️ Found user:', user.email);

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            console.log('🗑️ Invalid password provided');
            return res.status(401).json({
                error: 'Invalid password',
                message: 'Password is incorrect'
            });
        }

        console.log('🗑️ Password verified, proceeding with deletion...');

        // Use database transaction for safe deletion
        await req.db.query('BEGIN');

        try {
            // Delete in proper order to avoid foreign key constraints
            console.log('🗑️ Deleting email verifications...');
            await req.db.query('DELETE FROM email_verifications WHERE user_id = $1', [userId]);
            
            console.log('🗑️ Deleting transactions...');
            await req.db.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
            
            console.log('🗑️ Deleting wallet...');
            await req.db.query('DELETE FROM wallet WHERE user_id = $1', [userId]);
            
            console.log('🗑️ Deleting user account...');
            const deleteResult = await req.db.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
            
            if (deleteResult.rows.length === 0) {
                throw new Error('User deletion failed - user not found');
            }

            // Commit transaction
            await req.db.query('COMMIT');
            console.log('🗑️ Account deletion completed successfully');

            res.json({
                success: true,
                message: 'Account deleted successfully'
            });

        } catch (deleteError) {
            // Rollback on error
            await req.db.query('ROLLBACK');
            console.error('🗑️ Transaction failed, rolled back:', deleteError);
            throw deleteError;
        }

    } catch (error) {
        console.error('🗑️ Account deletion error:', error);
        res.status(500).json({
            error: 'Account deletion failed',
            message: 'An error occurred while deleting your account: ' + error.message
        });
    }
});

// Export authenticateToken for use in other routes
router.authenticateToken = authenticateToken;

module.exports = router;