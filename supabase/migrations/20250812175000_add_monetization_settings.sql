-- Create a table to hold monetization settings
CREATE TABLE IF NOT EXISTS monetization_settings (
  id SERIAL PRIMARY KEY,
  monetization_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert a default setting for monetization
INSERT INTO monetization_settings (monetization_enabled)
VALUES (true);

-- Add a column to the characters table to control revenue sharing
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS share_revenue BOOLEAN NOT NULL DEFAULT true;

-- Add RLS policies for the monetization_settings table
ALTER TABLE monetization_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to monetization settings" ON monetization_settings;
CREATE POLICY "Allow public read access to monetization settings"
ON monetization_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow admin write access to monetization settings" ON monetization_settings;
CREATE POLICY "Allow admin write access to monetization settings"
ON monetization_settings
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());