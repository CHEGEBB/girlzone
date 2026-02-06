-- Create models table for purchasable AI models
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  token_cost INTEGER NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_models table to track purchased models
CREATE TABLE IF NOT EXISTS user_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, model_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS models_category_idx ON models (category);
CREATE INDEX IF NOT EXISTS models_is_active_idx ON models (is_active);
CREATE INDEX IF NOT EXISTS user_models_user_id_idx ON user_models (user_id);
CREATE INDEX IF NOT EXISTS user_models_model_id_idx ON user_models (model_id);

-- Enable Row Level Security
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_models ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view active models
CREATE POLICY "Users can view active models" 
  ON models FOR SELECT 
  USING (is_active = true);

-- Create policy for users to view their own purchased models
CREATE POLICY "Users can view their own purchased models" 
  ON user_models FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own purchased models
CREATE POLICY "Users can purchase models" 
  ON user_models FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for server-side functions to manage models
CREATE POLICY "Server can manage models" 
  ON models FOR ALL 
  USING (true);

-- Create policy for server-side functions to manage user models
CREATE POLICY "Server can manage user models" 
  ON user_models FOR ALL 
  USING (true);
