-- Create upgate_sessions table for tracking Upgate payment sessions
CREATE TABLE IF NOT EXISTS upgate_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE,
  merchant_payment_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending',
  transaction_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_upgate_sessions_merchant_payment_id ON upgate_sessions(merchant_payment_id);
CREATE INDEX IF NOT EXISTS idx_upgate_sessions_user_id ON upgate_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upgate_sessions_status ON upgate_sessions(status);

-- Enable Row Level Security
ALTER TABLE upgate_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own sessions
CREATE POLICY "Users can view their own upgate sessions"
  ON upgate_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for service role to manage all sessions
CREATE POLICY "Service role can manage all upgate sessions"
  ON upgate_sessions
  FOR ALL
  USING (auth.role() = 'service_role');
