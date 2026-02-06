-- Enhanced Collections and Images Schema with Cloudinary Integration
-- This migration adds Cloudinary integration fields to the generated_images table

-- Add Cloudinary fields to generated_images table
ALTER TABLE generated_images 
ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT,
ADD COLUMN IF NOT EXISTS cloudinary_folder TEXT DEFAULT 'collections';

-- Create index for Cloudinary public_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_generated_images_cloudinary_public_id ON generated_images(cloudinary_public_id);

-- Create index for Cloudinary folder for faster lookups
CREATE INDEX IF NOT EXISTS idx_generated_images_cloudinary_folder ON generated_images(cloudinary_folder);

-- Update the collections table to include additional metadata
ALTER TABLE collections 
ADD COLUMN IF NOT EXISTS cloudinary_folder TEXT DEFAULT 'collections',
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create index for public collections
CREATE INDEX IF NOT EXISTS idx_collections_is_public ON collections(is_public);

-- Create a function to automatically generate Cloudinary folder names for collections
CREATE OR REPLACE FUNCTION generate_collection_folder()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate folder name based on collection name and user_id
  NEW.cloudinary_folder := 'collections/' || NEW.user_id || '/' || LOWER(REPLACE(NEW.name, ' ', '-'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set cloudinary_folder when creating collections
DROP TRIGGER IF EXISTS set_collection_folder ON collections;
CREATE TRIGGER set_collection_folder
  BEFORE INSERT ON collections
  FOR EACH ROW
  EXECUTE FUNCTION generate_collection_folder();

-- Create a function to update collection folder when name changes
CREATE OR REPLACE FUNCTION update_collection_folder()
RETURNS TRIGGER AS $$
BEGIN
  -- Update folder name if collection name changed
  IF OLD.name != NEW.name THEN
    NEW.cloudinary_folder := 'collections/' || NEW.user_id || '/' || LOWER(REPLACE(NEW.name, ' ', '-'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update cloudinary_folder when collection name changes
DROP TRIGGER IF EXISTS update_collection_folder ON collections;
CREATE TRIGGER update_collection_folder
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_folder();

-- Create a view for collections with image statistics
CREATE OR REPLACE VIEW collections_with_stats AS
SELECT 
  c.*,
  COUNT(gi.id) as total_images,
  COUNT(CASE WHEN gi.favorite = true THEN 1 END) as favorite_images,
  MAX(gi.created_at) as latest_image_date,
  MIN(gi.created_at) as earliest_image_date
FROM collections c
LEFT JOIN generated_images gi ON c.id = gi.collection_id AND c.user_id = gi.user_id
GROUP BY c.id, c.user_id, c.name, c.description, c.created_at, c.updated_at, c.cloudinary_folder, c.is_public, c.thumbnail_url;

-- Create RLS policies for the new fields
-- Allow users to view their own images with Cloudinary data
CREATE POLICY "Users can view their own images with cloudinary data" 
  ON generated_images FOR SELECT 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- Allow users to update their own images with Cloudinary data
CREATE POLICY "Users can update their own images with cloudinary data" 
  ON generated_images FOR UPDATE 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- Allow users to view their own collections with metadata
CREATE POLICY "Users can view their own collections with metadata" 
  ON collections FOR SELECT 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- Allow users to update their own collections with metadata
CREATE POLICY "Users can update their own collections with metadata" 
  ON collections FOR UPDATE 
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

-- Create a function to clean up orphaned Cloudinary images
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- This function would be called periodically to clean up images
  -- that exist in Cloudinary but not in the database
  -- Implementation would depend on your specific cleanup strategy
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get collection statistics
CREATE OR REPLACE FUNCTION get_collection_stats(collection_uuid UUID)
RETURNS TABLE(
  total_images BIGINT,
  favorite_images BIGINT,
  latest_image_date TIMESTAMPTZ,
  earliest_image_date TIMESTAMPTZ,
  total_size_bytes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(gi.id) as total_images,
    COUNT(CASE WHEN gi.favorite = true THEN 1 END) as favorite_images,
    MAX(gi.created_at) as latest_image_date,
    MIN(gi.created_at) as earliest_image_date,
    SUM(LENGTH(gi.image_url)) as total_size_bytes -- Rough estimate
  FROM generated_images gi
  WHERE gi.collection_id = collection_uuid;
END;
$$ LANGUAGE plpgsql;
