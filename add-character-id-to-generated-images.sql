-- Add character_id column to generated_images table for character gallery functionality
-- This migration adds the character_id field to link generated images to specific characters

-- Step 1: Make user_id nullable and add character_id column to generated_images table
ALTER TABLE generated_images 
ALTER COLUMN user_id DROP NOT NULL,
ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- Step 2: Create index for better performance when querying by character_id
CREATE INDEX IF NOT EXISTS idx_generated_images_character_id ON generated_images(character_id);

-- Step 3: Update RLS policies to handle character_id
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can only see their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only insert their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only update their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only delete their own images" ON generated_images;
DROP POLICY IF EXISTS "Anonymous users can view public images" ON generated_images;

-- Create new policies that work with character_id
CREATE POLICY "Users can see their own images or images linked to their characters"
ON generated_images FOR SELECT
USING (
  auth.uid() = user_id OR 
  user_id IS NULL OR
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert images for their characters"
ON generated_images FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR 
  user_id IS NULL OR
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own images or images linked to their characters"
ON generated_images FOR UPDATE
USING (
  auth.uid() = user_id OR 
  user_id IS NULL OR
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own images or images linked to their characters"
ON generated_images FOR DELETE
USING (
  auth.uid() = user_id OR 
  user_id IS NULL OR
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

-- Step 4: Add comment to document the new column
COMMENT ON COLUMN generated_images.character_id IS 'Links generated images to specific characters for gallery functionality';
