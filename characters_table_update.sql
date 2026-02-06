-- Add missing columns to existing characters table for user-created characters

-- First, check if columns exist and add them if they don't
DO $$ 
BEGIN
    -- Add background column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'characters' AND column_name = 'background') THEN
        ALTER TABLE characters ADD COLUMN background TEXT;
    END IF;

    -- Add system_prompt column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'characters' AND column_name = 'system_prompt') THEN
        ALTER TABLE characters ADD COLUMN system_prompt TEXT;
    END IF;

    -- Add greeting column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'characters' AND column_name = 'greeting') THEN
        ALTER TABLE characters ADD COLUMN greeting TEXT;
    END IF;

    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'characters' AND column_name = 'user_id') THEN
        ALTER TABLE characters ADD COLUMN user_id UUID;
    END IF;

    -- Add is_public column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'characters' AND column_name = 'is_public') THEN
        ALTER TABLE characters ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;

    -- Add hobbies column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'characters' AND column_name = 'hobbies') THEN
        ALTER TABLE characters ADD COLUMN hobbies TEXT;
    END IF;

    -- Add language column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'characters' AND column_name = 'language') THEN
        ALTER TABLE characters ADD COLUMN language VARCHAR(50) DEFAULT 'English';
    END IF;

    -- Add relationship column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'characters' AND column_name = 'relationship') THEN
        ALTER TABLE characters ADD COLUMN relationship VARCHAR(50);
    END IF;

    -- Add occupation column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'characters' AND column_name = 'occupation') THEN
        ALTER TABLE characters ADD COLUMN occupation VARCHAR(100);
    END IF;
END $$;

-- Add index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);

-- Add index on is_public for filtering
CREATE INDEX IF NOT EXISTS idx_characters_is_public ON characters(is_public);

-- Create Row Level Security policies for user-created characters
DO $$ 
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own characters and public characters" ON characters;
    DROP POLICY IF EXISTS "Users can insert their own characters" ON characters;
    DROP POLICY IF EXISTS "Users can update their own characters" ON characters;
    DROP POLICY IF EXISTS "Users can delete their own characters" ON characters;
    
    -- Create policies
    CREATE POLICY "Users can view their own characters and public characters" ON characters
        FOR SELECT USING (
            is_public = true OR 
            auth.uid() = user_id OR
            user_id IS NULL
        );

    CREATE POLICY "Users can insert their own characters" ON characters
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own characters" ON characters
        FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own characters" ON characters
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Policy already exists, ignore
END $$;
