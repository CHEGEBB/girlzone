-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_image BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    is_video BOOLEAN DEFAULT FALSE,
    video_url TEXT,
    is_error BOOLEAN DEFAULT FALSE,
    error_prompt TEXT
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_user_character ON messages(user_id, character_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for AI (service role) to insert messages - typically handled by bypassing RLS on server side, 
-- but if we use the client SDK with user token, we need this.
-- However, for now, we'll assume server actions use service role or user context.

-- Function to update character's message count and last interaction
CREATE OR REPLACE FUNCTION update_character_stats_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp on the character to track recent activity
    -- This might need a separate table for user-character interactions if we want per-user recent chats
    -- For now, let's just ensure we can query recent messages efficiently.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_character_stats
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_character_stats_on_message();
