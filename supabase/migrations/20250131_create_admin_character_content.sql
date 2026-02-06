-- Create table for admin-uploaded character content
CREATE TABLE IF NOT EXISTS admin_character_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    tab_type VARCHAR(20) NOT NULL CHECK (tab_type IN ('gallery', 'unlocked')),
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_content_character ON admin_character_content(character_id);
CREATE INDEX IF NOT EXISTS idx_admin_content_tab ON admin_character_content(character_id, tab_type);
CREATE INDEX IF NOT EXISTS idx_admin_content_created ON admin_character_content(created_at DESC);

-- Disable Row Level Security (admin page handles authentication)
-- This allows the API to insert/delete without auth context issues
ALTER TABLE admin_character_content DISABLE ROW LEVEL SECURITY;

-- Add comment to table
COMMENT ON TABLE admin_character_content IS 'Stores images uploaded by admins for character gallery and unlocked tabs';
COMMENT ON COLUMN admin_character_content.tab_type IS 'Determines which tab the image appears in: gallery or unlocked';
