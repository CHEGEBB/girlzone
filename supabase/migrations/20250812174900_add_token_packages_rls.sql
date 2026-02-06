-- Enable Row Level Security on token_packages table
ALTER TABLE token_packages ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to token packages (needed for premium page)
CREATE POLICY "Allow public read access to token packages" 
  ON token_packages FOR SELECT 
  USING (true);

-- Create policy for authenticated users to manage token packages (admin access)
CREATE POLICY "Allow authenticated users to manage token packages" 
  ON token_packages FOR ALL 
  USING (auth.role() = 'authenticated');

-- Create policy for service role to manage token packages
CREATE POLICY "Allow service role to manage token packages" 
  ON token_packages FOR ALL 
  USING (auth.role() = 'service_role');
