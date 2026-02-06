-- User referral system database schema
-- This migration creates the tables for a user referral system

-- Users table (extending existing users)
-- Assuming users table already exists, we need to add referral_code and tokens columns
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens INTEGER DEFAULT 0;

-- Enable UUID extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create referral_clicks table to log clicks on referral links
CREATE TABLE IF NOT EXISTS referral_clicks (
    id SERIAL PRIMARY KEY,
    referral_code VARCHAR(12) NOT NULL,
    ip_address INET NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT
);

-- Create indexes for referral_clicks
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_ip ON referral_clicks(ip_address);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_created ON referral_clicks(created_at);

-- Create referral_signups table to track successful referrals
CREATE TABLE IF NOT EXISTS referral_signups (
    id SERIAL PRIMARY KEY,
    referrer_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_given BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(referrer_id, referred_user_id)
);

-- Create indexes for referral_signups
CREATE INDEX IF NOT EXISTS idx_referral_signups_referrer ON referral_signups(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_signups_referred ON referral_signups(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_signups_created ON referral_signups(created_at);

-- Add referrals table to track user referral codes and stats
CREATE TABLE IF NOT EXISTS user_referrals (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(12) NOT NULL UNIQUE,
    total_clicks INTEGER DEFAULT 0,
    total_signups INTEGER DEFAULT 0,
    tokens_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes for user_referrals
CREATE INDEX IF NOT EXISTS idx_user_referrals_code ON user_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_referrals_user ON user_referrals(user_id);

-- Create function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    result TEXT;
    exists_already BOOLEAN := TRUE;
BEGIN
    WHILE exists_already LOOP
        -- Generate a random 8-character code using letters and numbers
        result := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
        -- Check if this code already exists
        SELECT EXISTS(SELECT 1 FROM user_referrals WHERE referral_code = result) INTO exists_already;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate referral code format
CREATE OR REPLACE FUNCTION validate_referral_code(code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if code is 4-12 characters, contains only letters and numbers
    RETURN code ~ '^[A-Z0-9]{4,12}$';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_referrals_updated_at ON user_referrals;
CREATE TRIGGER update_user_referrals_updated_at
    BEFORE UPDATE ON user_referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE referral_clicks IS 'Logs all clicks on referral links with IP tracking to prevent abuse';
COMMENT ON TABLE referral_signups IS 'Tracks successful referral relationships and reward status';
COMMENT ON TABLE user_referrals IS 'Stores user referral codes and aggregated statistics';
