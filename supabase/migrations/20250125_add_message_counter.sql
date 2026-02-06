-- Add message counter to user_tokens table
ALTER TABLE user_tokens 
ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN user_tokens.message_count IS 'Tracks the number of messages sent by the user. 1 token is deducted every 4 messages.';
