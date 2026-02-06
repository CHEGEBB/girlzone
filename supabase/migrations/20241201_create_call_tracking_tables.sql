-- Create call_sessions table to track active calls
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID,
  call_id TEXT NOT NULL, -- External call ID from Bland AI
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'active', 'completed', 'failed')),
  tokens_charged INTEGER NOT NULL DEFAULT 0, -- Initial tokens charged
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 1, -- Initial estimate
  actual_duration_seconds INTEGER DEFAULT 0, -- Actual duration when call ends
  tokens_per_minute INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create call_billing table to track additional charges for long calls
CREATE TABLE IF NOT EXISTS call_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_type TEXT NOT NULL CHECK (billing_type IN ('initial', 'additional_minutes')),
  minutes_billed INTEGER NOT NULL,
  tokens_charged INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS call_sessions_user_id_idx ON call_sessions (user_id);
CREATE INDEX IF NOT EXISTS call_sessions_call_id_idx ON call_sessions (call_id);
CREATE INDEX IF NOT EXISTS call_sessions_status_idx ON call_sessions (status);
CREATE INDEX IF NOT EXISTS call_billing_call_session_id_idx ON call_billing (call_session_id);
CREATE INDEX IF NOT EXISTS call_billing_user_id_idx ON call_billing (user_id);

-- Enable Row Level Security
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_billing ENABLE ROW LEVEL SECURITY;

-- Create policies for users to view their own call data
CREATE POLICY "Users can view their own call sessions" 
  ON call_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own call billing" 
  ON call_billing FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policies for server-side functions to manage call data
CREATE POLICY "Server can manage call sessions" 
  ON call_sessions FOR ALL 
  USING (true);

CREATE POLICY "Server can manage call billing" 
  ON call_billing FOR ALL 
  USING (true);

-- Create policy for admins to view all call data
CREATE POLICY "Admins can view all call sessions" 
  ON call_sessions FOR SELECT 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.users.email IN (
      SELECT email FROM admin_users
    )
  ));

CREATE POLICY "Admins can view all call billing" 
  ON call_billing FOR SELECT 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.users.email IN (
      SELECT email FROM admin_users
    )
  ));
