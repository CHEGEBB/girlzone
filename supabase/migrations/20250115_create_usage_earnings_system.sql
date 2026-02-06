-- Create model_usage_logs table to track every time a model is used
CREATE TABLE IF NOT EXISTS model_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('image_generation', 'chat', 'other')),
  tokens_consumed INTEGER NOT NULL DEFAULT 0,
  earnings_generated DECIMAL(10,4) NOT NULL DEFAULT 0.00,
  usage_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create model_creator_earnings table to track total earnings per model
CREATE TABLE IF NOT EXISTS model_creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  total_usage_count INTEGER NOT NULL DEFAULT 0,
  total_tokens_consumed INTEGER NOT NULL DEFAULT 0,
  total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  last_usage_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(model_id)
);

-- Create earnings_transactions table for payout tracking
CREATE TABLE IF NOT EXISTS earnings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earnings', 'payout', 'bonus', 'adjustment')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payout_method TEXT,
  payout_reference TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create model_analytics table for detailed analytics
CREATE TABLE IF NOT EXISTS model_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  tokens_consumed INTEGER NOT NULL DEFAULT 0,
  earnings_generated DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  avg_usage_per_user DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(model_id, date)
);

-- Add creator_id to models table
ALTER TABLE models ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE models ADD COLUMN IF NOT EXISTS earnings_per_use DECIMAL(10,4) DEFAULT 0.01;
ALTER TABLE models ADD COLUMN IF NOT EXISTS earnings_per_token DECIMAL(10,4) DEFAULT 0.001;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS model_usage_logs_user_id_idx ON model_usage_logs (user_id);
CREATE INDEX IF NOT EXISTS model_usage_logs_model_id_idx ON model_usage_logs (model_id);
CREATE INDEX IF NOT EXISTS model_usage_logs_created_at_idx ON model_usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS model_usage_logs_usage_type_idx ON model_usage_logs (usage_type);

CREATE INDEX IF NOT EXISTS model_creator_earnings_model_id_idx ON model_creator_earnings (model_id);
CREATE INDEX IF NOT EXISTS model_creator_earnings_creator_id_idx ON model_creator_earnings (creator_id);
CREATE INDEX IF NOT EXISTS model_creator_earnings_total_earnings_idx ON model_creator_earnings (total_earnings DESC);

CREATE INDEX IF NOT EXISTS earnings_transactions_creator_id_idx ON earnings_transactions (creator_id);
CREATE INDEX IF NOT EXISTS earnings_transactions_model_id_idx ON earnings_transactions (model_id);
CREATE INDEX IF NOT EXISTS earnings_transactions_status_idx ON earnings_transactions (status);
CREATE INDEX IF NOT EXISTS earnings_transactions_created_at_idx ON earnings_transactions (created_at DESC);

CREATE INDEX IF NOT EXISTS model_analytics_model_id_idx ON model_analytics (model_id);
CREATE INDEX IF NOT EXISTS model_analytics_date_idx ON model_analytics (date DESC);
CREATE INDEX IF NOT EXISTS model_analytics_earnings_idx ON model_analytics (earnings_generated DESC);

-- Enable Row Level Security
ALTER TABLE model_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own usage logs
CREATE POLICY "Users can view their own usage logs" 
  ON model_usage_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- Creators can view earnings for their models
CREATE POLICY "Creators can view their model earnings" 
  ON model_creator_earnings FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM models 
      WHERE models.id = model_creator_earnings.model_id 
      AND models.creator_id = auth.uid()
    )
  );

-- Creators can view their earnings transactions
CREATE POLICY "Creators can view their earnings transactions" 
  ON earnings_transactions FOR SELECT 
  USING (auth.uid() = creator_id);

-- Creators can view analytics for their models
CREATE POLICY "Creators can view their model analytics" 
  ON model_analytics FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM models 
      WHERE models.id = model_analytics.model_id 
      AND models.creator_id = auth.uid()
    )
  );

-- Server-side functions can manage all earnings data
CREATE POLICY "Server can manage usage logs" 
  ON model_usage_logs FOR ALL 
  USING (true);

CREATE POLICY "Server can manage creator earnings" 
  ON model_creator_earnings FOR ALL 
  USING (true);

CREATE POLICY "Server can manage earnings transactions" 
  ON earnings_transactions FOR ALL 
  USING (true);

CREATE POLICY "Server can manage model analytics" 
  ON model_analytics FOR ALL 
  USING (true);
