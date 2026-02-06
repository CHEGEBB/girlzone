-- Create table for user AI characters
CREATE TABLE IF NOT EXISTS user_characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    character_name VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    style VARCHAR(50) NOT NULL, -- 'realistic' or 'anime'
    ethnicity VARCHAR(50),
    age VARCHAR(50),
    eye_color VARCHAR(50),
    hair_style VARCHAR(50),
    hair_color VARCHAR(50),
    body_type VARCHAR(50),
    breast_size VARCHAR(50),
    butt_size VARCHAR(50),
    personality VARCHAR(50),
    relationship VARCHAR(50),
    enhanced_prompt TEXT,
    is_private BOOLEAN DEFAULT true,
    unique_users INTEGER DEFAULT 0,
    unique_chats INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,
    pictures_unlocked INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_characters_user_id ON user_characters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_characters_created_at ON user_characters(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_characters ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own characters
CREATE POLICY "Users can view their own characters" ON user_characters
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own characters
CREATE POLICY "Users can insert their own characters" ON user_characters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own characters
CREATE POLICY "Users can update their own characters" ON user_characters
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own characters
CREATE POLICY "Users can delete their own characters" ON user_characters
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_characters_updated_at BEFORE UPDATE ON user_characters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
