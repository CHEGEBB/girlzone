-- Create table to track gallery unlocks
CREATE TABLE IF NOT EXISTS gallery_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, character_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS gallery_unlocks_user_id_idx ON gallery_unlocks (user_id);
CREATE INDEX IF NOT EXISTS gallery_unlocks_character_id_idx ON gallery_unlocks (character_id);

-- Enable Row Level Security
ALTER TABLE gallery_unlocks ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own unlocks
CREATE POLICY "Users can view their own gallery unlocks" 
ON gallery_unlocks FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to insert their own unlocks (via API)
CREATE POLICY "Users can insert their own gallery unlocks" 
ON gallery_unlocks FOR INSERT 
WITH CHECK (auth.uid() = user_id);
