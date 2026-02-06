-- Migration: Create theme_settings table
-- Description: Stores customizable theme colors that can be managed by admin
-- Date: 2025-01-10

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS theme_settings CASCADE;

-- Create theme_settings table with key-value structure
CREATE TABLE IF NOT EXISTS theme_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_theme_settings_key ON theme_settings(key);

-- Insert default theme values (based on current globals.css)
INSERT INTO theme_settings (key, value) VALUES
  -- Primary color (Orange - #f9761f converted to HSL)
  ('primary_hue', '24'),
  ('primary_saturation', '95'),
  ('primary_lightness', '55'),
  
  -- Light mode colors
  ('background_light_hue', '0'),
  ('background_light_saturation', '0'),
  ('background_light_lightness', '100'),
  
  ('foreground_light_hue', '222.2'),
  ('foreground_light_saturation', '84'),
  ('foreground_light_lightness', '4.9'),
  
  -- Dark mode colors
  ('background_dark_hue', '0'),
  ('background_dark_saturation', '0'),
  ('background_dark_lightness', '4'),
  
  ('foreground_dark_hue', '0'),
  ('foreground_dark_saturation', '0'),
  ('foreground_dark_lightness', '98'),
  
  -- Card colors (light mode)
  ('card_light_hue', '0'),
  ('card_light_saturation', '0'),
  ('card_light_lightness', '100'),
  
  -- Card colors (dark mode)
  ('card_dark_hue', '0'),
  ('card_dark_saturation', '0'),
  ('card_dark_lightness', '8'),
  
  -- Border colors (light mode)
  ('border_light_hue', '214.3'),
  ('border_light_saturation', '31.8'),
  ('border_light_lightness', '91.4'),
  
  -- Border colors (dark mode)
  ('border_dark_hue', '0'),
  ('border_dark_saturation', '0'),
  ('border_dark_lightness', '15')
ON CONFLICT (key) DO NOTHING;

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;

-- Allow all users to read theme settings
CREATE POLICY "Allow public read access to theme_settings"
  ON theme_settings FOR SELECT
  TO public
  USING (true);

-- Only allow authenticated users to update theme settings (admin check should be done in API)
CREATE POLICY "Allow authenticated users to update theme_settings"
  ON theme_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_theme_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER theme_settings_updated_at
  BEFORE UPDATE ON theme_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_theme_settings_updated_at();
