-- Micro-Investment Tracker Database Schema - Updated with Email Verification

-- Users table with email verification support
CREATE TABLE users (
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
);

-- Email verifications log table
CREATE TABLE email_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    merchant VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Round-ups table
CREATE TABLE roundups (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    roundup_amount DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet table (user's total savings)
CREATE TABLE wallet (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_balance DECIMAL(10,2) DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investment profiles table (for different risk levels)
CREATE TABLE investment_profiles (
    id SERIAL PRIMARY KEY,
    profile_name VARCHAR(20) UNIQUE NOT NULL,
    annual_return_rate DECIMAL(5,4) NOT NULL,
    description TEXT
);

-- Insert default investment profiles
INSERT INTO investment_profiles (profile_name, annual_return_rate, description) VALUES
('conservative', 0.0500, '5% annual return - Low risk with government bonds and fixed deposits'),
('balanced', 0.0800, '8% annual return - Medium risk with mix of stocks and bonds'),
('aggressive', 0.1200, '12% annual return - High risk with growth stocks and equity funds');

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX idx_roundups_user ON roundups(user_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_otp ON email_verifications(otp_code, expires_at);

-- Function to update wallet balance after roundup insertion
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $
BEGIN
    INSERT INTO wallet (user_id, total_balance, last_updated)
    VALUES (NEW.user_id, NEW.roundup_amount, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_balance = wallet.total_balance + NEW.roundup_amount,
        last_updated = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Function to initialize current_value for new roundups
CREATE OR REPLACE FUNCTION initialize_roundup_current_value()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.current_value IS NULL OR NEW.current_value = 0 THEN
        NEW.current_value = NEW.roundup_amount;
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Trigger to automatically update wallet when roundup is added
CREATE TRIGGER trigger_update_wallet
    AFTER INSERT ON roundups
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_balance();

-- Trigger to initialize current_value when roundup is created
CREATE TRIGGER trigger_initialize_roundup_value
    BEFORE INSERT ON roundups
    FOR EACH ROW
    EXECUTE FUNCTION initialize_roundup_current_value();

-- Function to update user updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update users.updated_at
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();