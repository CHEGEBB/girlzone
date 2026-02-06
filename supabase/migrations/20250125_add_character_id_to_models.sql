-- Add character_id column to models table to link models to characters
DO $$ 
BEGIN
    -- Add character_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'models' AND column_name = 'character_id') THEN
        ALTER TABLE models ADD COLUMN character_id UUID REFERENCES characters(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add index on character_id for faster queries
CREATE INDEX IF NOT EXISTS models_character_id_idx ON models (character_id);

-- Add comment for documentation
COMMENT ON COLUMN models.character_id IS 'References the character that this model is based on';
