-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
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

-- Create withdrawal_transactions table for history
CREATE TABLE IF NOT EXISTS withdrawal_transactions (
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
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_user_id ON withdrawal_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_created_at ON withdrawal_transactions(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_withdrawal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for withdrawal_requests
DROP TRIGGER IF EXISTS set_withdrawal_updated_at ON withdrawal_requests;
CREATE TRIGGER set_withdrawal_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_withdrawal_updated_at();

-- Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can create their own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can update their pending requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can view their own withdrawal transactions" ON withdrawal_transactions;
DROP POLICY IF EXISTS "Service role can manage withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Service role can manage withdrawal transactions" ON withdrawal_transactions;

-- Create RLS Policies for withdrawal_requests
CREATE POLICY "Users can view their own withdrawal requests"
    ON withdrawal_requests
    FOR SELECT
    TO authenticated
    USING (withdrawal_requests.user_id = auth.uid());

CREATE POLICY "Users can create their own withdrawal requests"
    ON withdrawal_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (withdrawal_requests.user_id = auth.uid());

CREATE POLICY "Users can update their pending requests"
    ON withdrawal_requests
    FOR UPDATE
    TO authenticated
    USING (withdrawal_requests.user_id = auth.uid() AND withdrawal_requests.status = 'pending');

-- Create RLS Policies for withdrawal_transactions
CREATE POLICY "Users can view their own withdrawal transactions"
    ON withdrawal_transactions
    FOR SELECT
    TO authenticated
    USING (withdrawal_transactions.user_id = auth.uid());

-- Service role policies (for server-side operations)
CREATE POLICY "Service role can manage withdrawal requests"
    ON withdrawal_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage withdrawal transactions"
    ON withdrawal_transactions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE withdrawal_requests IS 'Stores withdrawal requests from users';
COMMENT ON TABLE withdrawal_transactions IS 'Stores completed withdrawal transaction history';
COMMENT ON COLUMN withdrawal_requests.payment_method IS 'Payment method: paypal or usdt_trc20';
COMMENT ON COLUMN withdrawal_requests.payment_details IS 'JSON containing payment details (email for PayPal, wallet address for USDT)';
COMMENT ON COLUMN withdrawal_requests.status IS 'Status: pending, approved, rejected, completed';
