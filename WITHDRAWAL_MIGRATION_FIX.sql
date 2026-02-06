-- FRESH MIGRATION FOR WITHDRAWAL SYSTEM
-- Run this as a completely new migration

-- First, drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS withdrawal_transactions CASCADE;
DROP TABLE IF EXISTS withdrawal_requests CASCADE;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS update_withdrawal_updated_at() CASCADE;

-- Create withdrawal_requests table
CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 50.00),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('paypal', 'usdt_trc20')),
    payment_details JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawal_transactions table
CREATE TABLE withdrawal_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    withdrawal_request_id UUID REFERENCES withdrawal_requests(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_details JSONB NOT NULL,
    status TEXT NOT NULL,
    transaction_hash TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);
CREATE INDEX idx_withdrawal_transactions_user_id ON withdrawal_transactions(user_id);
CREATE INDEX idx_withdrawal_transactions_created_at ON withdrawal_transactions(created_at DESC);

-- Create function for updated_at
CREATE FUNCTION update_withdrawal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_withdrawal_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_withdrawal_updated_at();

-- Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_transactions ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies without complex references
-- For withdrawal_requests
CREATE POLICY "withdrawal_requests_select_policy"
    ON withdrawal_requests
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR
        auth.role() = 'service_role'
    );

CREATE POLICY "withdrawal_requests_insert_policy"
    ON withdrawal_requests
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR
        auth.role() = 'service_role'
    );

CREATE POLICY "withdrawal_requests_update_policy"
    ON withdrawal_requests
    FOR UPDATE
    USING (
        (auth.uid() = user_id AND status = 'pending')
        OR
        auth.role() = 'service_role'
    );

CREATE POLICY "withdrawal_requests_delete_policy"
    ON withdrawal_requests
    FOR DELETE
    USING (auth.role() = 'service_role');

-- For withdrawal_transactions
CREATE POLICY "withdrawal_transactions_select_policy"
    ON withdrawal_transactions
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR
        auth.role() = 'service_role'
    );

CREATE POLICY "withdrawal_transactions_insert_policy"
    ON withdrawal_transactions
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "withdrawal_transactions_update_policy"
    ON withdrawal_transactions
    FOR UPDATE
    USING (auth.role() = 'service_role');

CREATE POLICY "withdrawal_transactions_delete_policy"
    ON withdrawal_transactions
    FOR DELETE
    USING (auth.role() = 'service_role');

-- Add comments
COMMENT ON TABLE withdrawal_requests IS 'Stores withdrawal requests from users';
COMMENT ON TABLE withdrawal_transactions IS 'Stores completed withdrawal transaction history';
COMMENT ON COLUMN withdrawal_requests.payment_method IS 'Payment method: paypal or usdt_trc20';
COMMENT ON COLUMN withdrawal_requests.payment_details IS 'JSON containing payment details';
COMMENT ON COLUMN withdrawal_requests.status IS 'Status: pending, approved, rejected, completed';
