-- Add earnings tracking to user_models table
ALTER TABLE user_models ADD COLUMN IF NOT EXISTS earnings_tokens INTEGER DEFAULT 0;
ALTER TABLE user_models ADD COLUMN IF NOT EXISTS earnings_usd DECIMAL(10,2) DEFAULT 0.00;

-- Create model_earnings table for tracking earnings from model usage
CREATE TABLE IF NOT EXISTS model_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  earnings_tokens INTEGER NOT NULL DEFAULT 0,
  earnings_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, model_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS model_earnings_user_id_idx ON model_earnings (user_id);
CREATE INDEX IF NOT EXISTS model_earnings_model_id_idx ON model_earnings (model_id);
CREATE INDEX IF NOT EXISTS model_earnings_last_earned_at_idx ON model_earnings (last_earned_at DESC);

-- Enable Row Level Security
ALTER TABLE model_earnings ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own earnings
CREATE POLICY "Users can view their own model earnings" 
  ON model_earnings FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for server-side functions to manage earnings
CREATE POLICY "Server can manage model earnings" 
  ON model_earnings FOR ALL 
  USING (true);
