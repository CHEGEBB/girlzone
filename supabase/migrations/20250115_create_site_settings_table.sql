-- Create site_settings table for storing site configuration
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only admins can read and modify site settings
CREATE POLICY "Admins can manage site settings" 
  ON site_settings FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Allow public read access to certain site settings (for frontend display)
CREATE POLICY "Public can read public site settings" 
  ON site_settings FOR SELECT 
  USING (
    key IN ('site_name', 'logo_text', 'pricing', 'language')
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS site_settings_key_idx ON site_settings (key);

-- Insert default site settings
INSERT INTO site_settings (key, value, description) VALUES
('site_name', '"Girlzone.ai"', 'The name of the site displayed in browser tabs and throughout the application'),
('logo_text', '"Girlzone"', 'The text part of the logo (before the .ai)'),
('language', '"en"', 'Default language for the site'),
('pricing', '{
  "currency": "$",
  "currencyPosition": "left",
  "monthly": {
    "price": 12.99,
    "originalPrice": 19.99,
    "discount": 35
  },
  "quarterly": {
    "price": 9.99,
    "originalPrice": 19.99,
    "discount": 50
  },
  "yearly": {
    "price": 5.99,
    "originalPrice": 19.99,
    "discount": 70
  }
}', 'Pricing configuration for premium subscriptions')
ON CONFLICT (key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_site_settings_updated_at();
