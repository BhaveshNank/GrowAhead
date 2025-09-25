-- Email Verification Migration
-- Run Date: 2025-01-XX

-- Add email verification columns to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0;

-- Create email verification log table for security tracking
CREATE TABLE IF NOT EXISTS email_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    verification_type VARCHAR(20) DEFAULT 'registration' CHECK (verification_type IN ('registration', 'password_reset')),
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_otp ON email_verifications(otp_code);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

-- Update existing users to be verified (for backward compatibility)
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;

-- Add comment for documentation
COMMENT ON TABLE email_verifications IS 'Email verification audit trail and OTP tracking';
COMMENT ON COLUMN users.email_verified IS 'Whether user email address has been verified';

-- Verification complete message
SELECT 'Email verification migration completed successfully!' as status;