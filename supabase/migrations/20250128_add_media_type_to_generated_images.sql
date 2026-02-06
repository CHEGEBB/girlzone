-- Add media_type column to generated_images table to support both images and videos
ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'image';

-- Add constraint to ensure only valid media types
ALTER TABLE generated_images ADD CONSTRAINT check_media_type CHECK (media_type IN ('image', 'video'));

-- Update existing records to have 'image' as media_type
UPDATE generated_images SET media_type = 'image' WHERE media_type IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_images_media_type ON generated_images(media_type);

-- Add comment for documentation
COMMENT ON COLUMN generated_images.media_type IS 'Type of generated media: image or video';
