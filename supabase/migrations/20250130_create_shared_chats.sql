-- Create shared_chats table for chat sharing functionality
CREATE TABLE IF NOT EXISTS shared_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL,
    share_code VARCHAR(50) UNIQUE NOT NULL,
    include_history BOOLEAN DEFAULT true,
    chat_data JSONB,
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shared_chats_user_id ON shared_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_chats_share_code ON shared_chats(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_chats_character_id ON shared_chats(character_id);
CREATE INDEX IF NOT EXISTS idx_shared_chats_created_at ON shared_chats(created_at DESC);

-- Enable Row Level Security
ALTER TABLE shared_chats ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own shared chats
CREATE POLICY "Users can view their own shared chats"
ON shared_chats FOR SELECT
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own shared chats
CREATE POLICY "Users can insert their own shared chats"
ON shared_chats FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own shared chats
CREATE POLICY "Users can update their own shared chats"
ON shared_chats FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own shared chats
CREATE POLICY "Users can delete their own shared chats"
ON shared_chats FOR DELETE
USING (auth.uid() = user_id);

-- Create policy to allow anyone to view active shared chats by share code
CREATE POLICY "Anyone can view active shared chats by code"
ON shared_chats FOR SELECT
USING (is_active = true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_shared_chats_updated_at 
BEFORE UPDATE ON shared_chats
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        new_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM shared_chats WHERE share_code = new_code) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to track share click and return affiliate info
CREATE OR REPLACE FUNCTION track_share_click(p_share_code TEXT)
RETURNS TABLE (
    character_id TEXT,
    user_id UUID,
    affiliate_code TEXT,
    include_history BOOLEAN,
    chat_data JSONB
) AS $$
DECLARE
    v_user_id UUID;
    v_affiliate_code TEXT;
BEGIN
    -- Update click count
    UPDATE shared_chats
    SET click_count = click_count + 1
    WHERE share_code = p_share_code AND is_active = true
    RETURNING shared_chats.user_id INTO v_user_id;
    
    -- Get affiliate code if user is an affiliate
    SELECT a.affiliate_code INTO v_affiliate_code
    FROM affiliates a
    WHERE a.user_id = v_user_id AND a.status = 'approved';
    
    -- Return the shared chat info
    RETURN QUERY
    SELECT 
        sc.character_id,
        sc.user_id,
        v_affiliate_code,
        sc.include_history,
        sc.chat_data
    FROM shared_chats sc
    WHERE sc.share_code = p_share_code AND sc.is_active = true;
END;
$$ LANGUAGE plpgsql;
