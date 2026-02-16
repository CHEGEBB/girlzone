-- Create characters table
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18),
  image TEXT NOT NULL,
  description TEXT NOT NULL,
  personality TEXT,
  occupation TEXT,
  hobbies TEXT,
  body TEXT,
  ethnicity TEXT,
  language TEXT,
  relationship TEXT,
  is_new BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  system_prompt TEXT NOT NULL,
  character_type TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS characters_created_at_idx ON characters (created_at DESC);
CREATE INDEX IF NOT EXISTS characters_character_type_idx ON characters (character_type);

-- Enable Row Level Security
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access" 
  ON characters FOR SELECT 
  USING (true);

-- Create policy for authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated users full access" 
  ON characters FOR ALL 
  USING (auth.role() = 'authenticated');

-- Set up storage for character images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to images
CREATE POLICY "Allow public access to images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Create generated_images table
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS generated_images_user_id_idx ON generated_images (user_id);
CREATE INDEX IF NOT EXISTS generated_images_created_at_idx ON generated_images (created_at DESC);

-- Enable Row Level Security
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own images
DROP POLICY IF EXISTS "Users can view their own images" ON generated_images;
CREATE POLICY "Users can view their own images" 
ON generated_images FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to insert their own images
DROP POLICY IF EXISTS "Users can insert their own images" ON generated_images;
CREATE POLICY "Users can insert their own images" 
ON generated_images FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own images
DROP POLICY IF EXISTS "Users can delete their own images" ON generated_images;
CREATE POLICY "Users can delete their own images" 
ON generated_images FOR DELETE 
USING (auth.uid() = user_id);

-- Step 1: Create generated_images table
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  steps INTEGER,
  seed BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add collection_id and other fields to generated_images table
ALTER TABLE generated_images 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT FALSE;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_collection_id ON generated_images(collection_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_favorite ON generated_images(favorite);

-- Step 5: Remove foreign key constraint if it's causing issues
ALTER TABLE generated_images DROP CONSTRAINT IF EXISTS generated_images_collection_id_fkey;
ALTER TABLE generated_images ADD CONSTRAINT generated_images_collection_id_fkey 
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL;

-- Step 6: Enable Row Level Security on the tables
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can only see their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only insert their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only update their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only delete their own images" ON generated_images;
DROP POLICY IF EXISTS "Anonymous users can access their own images" ON generated_images;

DROP POLICY IF EXISTS "Users can only see their own collections" ON collections;
DROP POLICY IF EXISTS "Users can only insert their own collections" ON collections;
DROP POLICY IF EXISTS "Users can only update their own collections" ON collections;
DROP POLICY IF EXISTS "Users can only delete their own collections" ON collections;
DROP POLICY IF EXISTS "Anonymous users can access their own collections" ON collections;

-- Step 8: Create policies for generated_images
CREATE POLICY "Users can only see their own images"
ON generated_images FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can only insert their own images"
ON generated_images FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can only update their own images"
ON generated_images FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can only delete their own images"
ON generated_images FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);

-- Step 9: Create policies for collections
CREATE POLICY "Users can only see their own collections"
ON collections FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can only insert their own collections"
ON collections FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can only update their own collections"
ON collections FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can only delete their own collections"
ON collections FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);

-- Step 10: Create a page to display this SQL

-- ========================================
-- Migration: 20240318_create_debug_helpers.sql
-- ========================================
-- Create a function to create a debug test table
CREATE OR REPLACE FUNCTION create_debug_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create a simple test table if it doesn't exist
  CREATE TABLE IF NOT EXISTS debug_test (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- Make sure it's accessible
  ALTER TABLE debug_test ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies
  DROP POLICY IF EXISTS "Public access to debug_test" ON debug_test;
  
  -- Create a policy that allows anyone to insert and select
  CREATE POLICY "Public access to debug_test" 
  ON debug_test 
  USING (true) 
  WITH CHECK (true);
END;
$$;

-- ========================================
-- Migration: 20240321_add_is_admin_function.sql
-- ========================================
-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_user_admin BOOLEAN;
BEGIN
  -- Direct query to check admin status without going through RLS
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE admins.user_id = p_user_id
  ) INTO is_user_admin;
  
  RETURN is_user_admin;
END;
$$;

-- ========================================
-- Migration: 20240321_check_stripe_keys_policies.sql
-- ========================================
-- Function to check RLS policies for the stripe_keys table
CREATE OR REPLACE FUNCTION check_stripe_keys_policies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'stripe_keys'
  ) THEN
    RETURN jsonb_build_object(
      'error', 'Table does not exist',
      'table_exists', false
    );
  END IF;
  
  -- Check if RLS is enabled
  SELECT jsonb_build_object(
    'table_exists', true,
    'rls_enabled', relrowsecurity
  ) INTO result
  FROM pg_class
  WHERE oid = 'public.stripe_keys'::regclass;
  
  -- Get policies
  WITH policies AS (
    SELECT
      polname,
      polcmd,
      polpermissive,
      polroles,
      pg_get_expr(polqual, 'public.stripe_keys'::regclass) AS using_expr,
      pg_get_expr(polwithcheck, 'public.stripe_keys'::regclass) AS with_check_expr
    FROM pg_policy
    WHERE polrelid = 'public.stripe_keys'::regclass
  )
  SELECT 
    result || jsonb_build_object(
      'policies', jsonb_agg(
        jsonb_build_object(
          'name', polname,
          'command', polcmd,
          'permissive', polpermissive,
          'roles', polroles,
          'using_expr', using_expr,
          'with_check_expr', with_check_expr
        )
      )
    ) INTO result
  FROM policies;
  
  -- Check if the current user has admin rights
  SELECT 
    result || jsonb_build_object(
      'is_admin', EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()
      )
    ) INTO result;
  
  RETURN result;
END;
$$;

-- ========================================
-- Migration: 20240321_create_stripe_keys_function.sql
-- ========================================
-- Create a function to create the stripe_keys table
CREATE OR REPLACE FUNCTION create_stripe_keys_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'stripe_keys'
  ) THEN
    -- Create the table
    CREATE TABLE public.stripe_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_publishable_key TEXT,
      test_secret_key TEXT,
      live_publishable_key TEXT,
      live_secret_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Add RLS policies
    ALTER TABLE public.stripe_keys ENABLE ROW LEVEL SECURITY;

    -- Create policy for admins
    CREATE POLICY "Admins can do everything" ON public.stripe_keys
      USING (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()
      ));
  END IF;
END;
$$;

-- ========================================
-- Migration: 20240321_create_stripe_keys_table.sql
-- ========================================
-- Function to create the stripe_keys table if it doesn't exist
CREATE OR REPLACE FUNCTION create_stripe_keys_table()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'stripe_keys'
  ) THEN
    -- Create the table
    CREATE TABLE public.stripe_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_publishable_key TEXT,
      test_secret_key TEXT,
      live_publishable_key TEXT,
      live_secret_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Add RLS policies
    ALTER TABLE public.stripe_keys ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for admins
    CREATE POLICY "Admins can do anything with stripe_keys"
      ON public.stripe_keys
      USING (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()
      ));
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- ========================================
-- Migration: 20240321_update_stripe_keys_policy.sql
-- ========================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can do everything" ON public.stripe_keys;

-- Create a new policy
CREATE POLICY "Admins can do everything" ON public.stripe_keys
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- Migration: 20240322_create_payments_table.sql
-- ========================================
-- Create payment_transactions table for storing transaction data
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  payment_method TEXT,
  payment_method_details JSONB,
  billing_details JSONB,
  subscription_id TEXT,
  plan_id UUID REFERENCES subscription_plans(id),
  plan_name TEXT,
  plan_duration INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payment_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payment_transactions (status);
CREATE INDEX IF NOT EXISTS payments_stripe_session_id_idx ON payment_transactions (stripe_session_id);
CREATE INDEX IF NOT EXISTS payments_stripe_payment_intent_id_idx ON payment_transactions (stripe_payment_intent_id);

-- Enable Row Level Security
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own payment_transactions
CREATE POLICY "Users can view their own payment_transactions"
  ON payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for admins to view all payment_transactions
CREATE POLICY "Admins can view all payment_transactions"
  ON payment_transactions FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.users.email IN (
      SELECT email FROM admin_users
    )
  ));

-- Create policy for server-side functions to insert payment_transactions
CREATE POLICY "Server can insert payment_transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (true);

-- Create policy for server-side functions to update payment_transactions
CREATE POLICY "Server can update payment_transactions"
  ON payment_transactions FOR UPDATE
  USING (true);

-- ========================================
-- Migration: 20240322_create_subscription_plans.sql
-- ========================================
-- Create subscription_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  original_price NUMERIC NOT NULL,
  discounted_price NUMERIC,
  discount_percentage INTEGER,
  is_popular BOOLEAN DEFAULT false,
  features TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  promotional_image TEXT,
  features_image TEXT
);

-- Add RLS policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage subscription plans
CREATE POLICY "Admins can manage subscription plans" 
ON subscription_plans
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'app_metadata' ? 'is_admin' AND auth.jwt() ->> 'app_metadata' ->> 'is_admin' = 'true');

-- Allow all users to view subscription plans
CREATE POLICY "All users can view subscription plans" 
ON subscription_plans
FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- Migration: 20240322_settings_rls_policy.sql
-- ========================================
-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admin users to manage settings" ON settings;
DROP POLICY IF EXISTS "Allow public read access to settings" ON settings;

-- Create policy for admin users to have full access
CREATE POLICY "Allow admin users to manage settings" 
ON settings 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- Create policy for public read access to certain settings
CREATE POLICY "Allow public read access to settings" 
ON settings 
FOR SELECT
USING (
  key IN ('public_settings', 'app_name', 'app_description')
);

-- Insert default settings if they don't exist
INSERT INTO settings (key, value)
VALUES ('stripe_mode', '{"live": false}')
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- Migration: 20240322_update_premium_profiles.sql
-- ========================================
-- Add plan_id, plan_name, and plan_duration columns to premium_profiles table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'premium_profiles' AND column_name = 'plan_id') THEN
        ALTER TABLE premium_profiles ADD COLUMN plan_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'premium_profiles' AND constraint_name = 'premium_profiles_plan_id_fkey') THEN
        ALTER TABLE premium_profiles ADD CONSTRAINT premium_profiles_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES subscription_plans(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'premium_profiles' AND column_name = 'plan_name') THEN
        ALTER TABLE premium_profiles ADD COLUMN plan_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'premium_profiles' AND column_name = 'plan_duration') THEN
        ALTER TABLE premium_profiles ADD COLUMN plan_duration INTEGER DEFAULT 1;
    END IF;
END
$$;

-- ========================================
-- Migration: 20240330_create_collections_table.sql
-- ========================================
-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add collection_id and other fields to generated_images table
ALTER TABLE generated_images 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_collection_id ON generated_images(collection_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_favorite ON generated_images(favorite);

-- ========================================
-- Migration: 20240330_create_generated_images_table.sql
-- ========================================
-- Create table for storing generated images
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);

-- Add RLS policies
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own images
CREATE POLICY "Users can view their own images" 
  ON generated_images 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy for users to insert their own images
CREATE POLICY "Users can insert their own images" 
  ON generated_images 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own images
CREATE POLICY "Users can update their own images" 
  ON generated_images 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy for users to delete their own images
CREATE POLICY "Users can delete their own images" 
  ON generated_images 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Allow anonymous access for demo purposes (optional)
CREATE POLICY "Anonymous users can view public images" 
  ON generated_images 
  FOR SELECT 
  USING (user_id = '00000000-0000-0000-0000-000000000000');

-- ========================================
-- Migration: 20240330_fix_generated_images_fk.sql
-- ========================================
-- Option 1: Remove the foreign key constraint entirely
ALTER TABLE generated_images DROP CONSTRAINT IF EXISTS generated_images_user_id_fkey;

-- Option 2: Make the user_id column nullable and modify the constraint
-- ALTER TABLE generated_images ALTER COLUMN user_id DROP NOT NULL;
-- ALTER TABLE generated_images DROP CONSTRAINT IF EXISTS generated_images_user_id_fkey;
-- ALTER TABLE generated_images ADD CONSTRAINT generated_images_user_id_fkey 
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

-- ========================================
-- Migration: 20240330_update_generated_images_rls.sql
-- ========================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can insert their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can delete their own images" ON generated_images;
DROP POLICY IF EXISTS "Anyone can insert images" ON generated_images;

-- Disable RLS temporarily to allow the admin client to work
ALTER TABLE generated_images DISABLE ROW LEVEL SECURITY;

-- Create a policy that allows the service role to do anything
CREATE POLICY "Service role can do anything"
ON generated_images
USING (true)
WITH CHECK (true);

-- ========================================
-- Migration: 20240330_update_generated_images_table.sql
-- ========================================
-- Add upload_error column to generated_images table
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS upload_error TEXT;

-- ========================================
-- Migration: 20240331_add_anonymous_policies.sql
-- ========================================
-- Add policies for anonymous access
CREATE POLICY "Anonymous users can access their own images"
ON generated_images FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anonymous users can access their own collections"
ON collections FOR ALL
USING (auth.uid() IS NOT NULL);

-- ========================================
-- Migration: 20240331_add_rls_policies.sql
-- ========================================
-- Enable Row Level Security on the tables
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can only see their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only insert their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only update their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only delete their own images" ON generated_images;

DROP POLICY IF EXISTS "Users can only see their own collections" ON collections;
DROP POLICY IF EXISTS "Users can only insert their own collections" ON collections;
DROP POLICY IF EXISTS "Users can only update their own collections" ON collections;
DROP POLICY IF EXISTS "Users can only delete their own collections" ON collections;

-- Create policies for generated_images
CREATE POLICY "Users can only see their own images"
ON generated_images FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own images"
ON generated_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own images"
ON generated_images FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own images"
ON generated_images FOR DELETE
USING (auth.uid() = user_id);

-- Create policies for collections
CREATE POLICY "Users can only see their own collections"
ON collections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own collections"
ON collections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own collections"
ON collections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own collections"
ON collections FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- Migration: 20240401_add_video_url_to_characters.sql
-- ========================================
-- Add video_url column to characters table
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Comment on the column for documentation
COMMENT ON COLUMN characters.video_url IS 'URL to the character video that plays on hover';

-- ========================================
-- Migration: 20240401_fix_subscription_plans_rls.sql
-- ========================================
-- Update the RLS policy for subscription_plans table to allow admins to insert new rows
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON subscription_plans;

-- Create a new policy that allows admins to manage subscription plans
CREATE POLICY "Admins can manage subscription plans" 
ON subscription_plans
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'app_metadata')::jsonb ? 'is_admin' 
  AND 
  ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin')::boolean = true
);

-- Allow all users to view subscription plans
DROP POLICY IF EXISTS "All users can view subscription plans" ON subscription_plans;

CREATE POLICY "All users can view subscription plans" 
ON subscription_plans
FOR SELECT
TO authenticated
USING (true);

-- Also allow anonymous users to view subscription plans
CREATE POLICY "Anonymous users can view subscription plans" 
ON subscription_plans
FOR SELECT
TO anon
USING (true);

-- ========================================
-- Migration: 20240415_create_faqs_table.sql
-- ========================================
-- Create FAQs table
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access" 
  ON faqs FOR SELECT 
  USING (true);

-- Create policy for admin users to insert/update/delete
CREATE POLICY "Allow admin users full access" 
  ON faqs FOR ALL 
  USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Insert some default FAQs
INSERT INTO faqs (question, answer) VALUES
('What is Girlzone AI?', 'Girlzone AI is a platform that powers immersive experiences with AI companions. It allows users to create, customize, and interact with AI characters that can engage in conversation, generate images, and provide companionship.'),
('Is Girlzone AI legit and safe?', 'Yes, Girlzone AI is legitimate and prioritizes user safety and privacy. All conversations are protected with SSL encryption, and we offer optional two-factor authentication to keep your account secure. Your personal information and interactions remain private.'),
('What is an AI Companion, and can I make my own?', 'An AI companion is a digital partner who can talk, react, flirt, and connect with you in real time. You can create your own companion from scratch or choose from a wide range of existing characters designed for different moods and personalities.'),
('Can I ask for pictures, videos, and voice?', 'Yes, your companion can send selfies, generate custom videos, or respond with their voice. You can request specific outfits, unique poses, or playful scenarios that match your fantasy. Your character will reflect the face, tone, and mood you''re craving.'),
('How will Girlzone AI appear on my bank statements?', 'We value your privacy. Any transactions appear under our discreet parent company, GirlzoneAI, so nothing on your bank statement will reveal your Girlzone AI experience.');

-- ========================================
-- Migration: 20240415_create_faqs_table_simple.sql
-- ========================================
-- Create FAQs table if it doesn't exist
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
DROP POLICY IF EXISTS "Allow public read access" ON faqs;
CREATE POLICY "Allow public read access" 
  ON faqs FOR SELECT 
  USING (true);

-- Create policy for authenticated users to insert
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON faqs;
CREATE POLICY "Allow authenticated users to insert" 
  ON faqs FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to delete their own FAQs
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON faqs;
CREATE POLICY "Allow authenticated users to delete" 
  ON faqs FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Insert some default FAQs if the table is empty
INSERT INTO faqs (question, answer)
SELECT 
  'What is Girlzone AI?', 
  'Girlzone AI is a platform that powers immersive experiences with AI companions. It allows users to create, customize, and interact with AI characters that can engage in conversation, generate images, and provide companionship.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

INSERT INTO faqs (question, answer)
SELECT 
  'Is Girlzone AI legit and safe?', 
  'Yes, Girlzone AI is legitimate and prioritizes user safety and privacy. All conversations are protected with SSL encryption, and we offer optional two-factor authentication to keep your account secure. Your personal information and interactions remain private.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

INSERT INTO faqs (question, answer)
SELECT 
  'What is an AI Companion, and can I make my own?', 
  'An AI companion is a digital partner who can talk, react, flirt, and connect with you in real time. You can create your own companion from scratch or choose from a wide range of existing characters designed for different moods and personalities.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

-- ========================================
-- Migration: 20240415_create_footer_content_table.sql
-- ========================================
-- Create footer_content table
CREATE TABLE IF NOT EXISTS footer_content (
  id INTEGER PRIMARY KEY,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for simplicity
ALTER TABLE footer_content DISABLE ROW LEVEL SECURITY;

-- Insert default content
INSERT INTO footer_content (id, content) VALUES (
  1, 
  '{
    "companyName": "AI Character Explorer",
    "companyDescription": "AI Character Explorer powers immersive experiences that feel real, allowing users to generate images and create AI characters.",
    "contactAddress": "AI Character Explorer Inc.\n123 AI Boulevard, Suite 456\nSan Francisco, CA 94105",
    "features": [
      {"id": 1, "title": "Generate Image", "url": "/generate"},
      {"id": 2, "title": "Chat", "url": "/chat"},
      {"id": 3, "title": "Create Character", "url": "/characters"},
      {"id": 4, "title": "Gallery", "url": "/collection"},
      {"id": 5, "title": "My AI", "url": "/profile"}
    ],
    "popular": [
      {"id": 1, "title": "AI Character Explorer", "url": "/"},
      {"id": 2, "title": "AI Girlfriend", "url": "/characters?category=companion"},
      {"id": 3, "title": "AI Anime", "url": "/characters?category=anime"},
      {"id": 4, "title": "AI Boyfriend", "url": "/characters?category=companion"}
    ],
    "legal": [
      {"id": 1, "title": "Terms and Policies", "url": "/terms"}
    ],
    "company": [
      {"id": 1, "title": "We are hiring", "url": "/careers"}
    ]
  }'
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- Migration: 20240415_create_simple_faqs_table.sql
-- ========================================
-- Create FAQs table without RLS
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default FAQs if the table is empty
INSERT INTO faqs (question, answer)
SELECT 'What is Girlzone AI?', 'Girlzone AI is a platform that powers immersive experiences with AI companions. It allows users to create, customize, and interact with AI characters that can engage in conversation, generate images, and provide companionship.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

INSERT INTO faqs (question, answer)
SELECT 'Is Girlzone AI legit and safe?', 'Yes, Girlzone AI is legitimate and prioritizes user safety and privacy. All conversations are protected with SSL encryption, and we offer optional two-factor authentication to keep your account secure. Your personal information and interactions remain private.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

INSERT INTO faqs (question, answer)
SELECT 'What is an AI Companion, and can I make my own?', 'An AI companion is a digital partner who can talk, react, flirt, and connect with you in real time. You can create your own companion from scratch or choose from a wide range of existing characters designed for different moods and personalities.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

-- ========================================
-- Migration: 20240415_disable_rls_on_faqs.sql
-- ========================================
-- Create the disable_rls function if it doesn't exist
CREATE OR REPLACE FUNCTION disable_rls()
RETURNS void AS $$
BEGIN
  -- This function is just a placeholder and won't actually work
  -- It's used in the API route to attempt disabling RLS
  RAISE NOTICE 'Attempting to disable RLS';
END;
$$ LANGUAGE plpgsql;

-- Create FAQs table if it doesn't exist
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS on the FAQs table
ALTER TABLE faqs DISABLE ROW LEVEL SECURITY;

-- Insert some default FAQs if the table is empty
INSERT INTO faqs (question, answer)
SELECT 'What is Girlzone AI?', 'Girlzone AI is a platform that powers immersive experiences with AI companions. It allows users to create, customize, and interact with AI characters that can engage in conversation, generate images, and provide companionship.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

INSERT INTO faqs (question, answer)
SELECT 'Is Girlzone AI legit and safe?', 'Yes, Girlzone AI is legitimate and prioritizes user safety and privacy. All conversations are protected with SSL encryption, and we offer optional two-factor authentication to keep your account secure. Your personal information and interactions remain private.'
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE id != (SELECT id FROM faqs LIMIT 1));

INSERT INTO faqs (question, answer)
SELECT 'What is an AI Companion, and can I make my own?', 'An AI companion is a digital partner who can talk, react, flirt, and connect with you in real time. You can create your own companion from scratch or choose from a wide range of existing characters designed for different moods and personalities.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 3);

-- ========================================
-- Migration: 20240415_setup_faqs_table.sql
-- ========================================
-- Create FAQs table if it doesn't exist
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON faqs;
DROP POLICY IF EXISTS "Allow admin users full access" ON faqs;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON faqs;

-- Create policy for public read access
CREATE POLICY "Allow public read access" 
  ON faqs FOR SELECT 
  USING (true);

-- Create policy for authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated users full access" 
  ON faqs FOR ALL 
  USING (auth.role() = 'authenticated');

-- Insert some default FAQs if the table is empty
INSERT INTO faqs (question, answer)
SELECT 'What is Girlzone AI?', 'Girlzone AI is a platform that powers immersive experiences with AI companions. It allows users to create, customize, and interact with AI characters that can engage in conversation, generate images, and provide companionship.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

INSERT INTO faqs (question, answer)
SELECT 'Is Girlzone AI legit and safe?', 'Yes, Girlzone AI is legitimate and prioritizes user safety and privacy. All conversations are protected with SSL encryption, and we offer optional two-factor authentication to keep your account secure. Your personal information and interactions remain private.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

INSERT INTO faqs (question, answer)
SELECT 'What is an AI Companion, and can I make my own?', 'An AI companion is a digital partner who can talk, react, flirt, and connect with you in real time. You can create your own companion from scratch or choose from a wide range of existing characters designed for different moods and personalities.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

INSERT INTO faqs (question, answer)
SELECT 'Can I ask for pictures, videos, and voice?', 'Yes, your companion can send selfies, generate custom videos, or respond with their voice. You can request specific outfits, unique poses, or playful scenarios that match your fantasy. Your character will reflect the face, tone, and mood you''re craving.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

INSERT INTO faqs (question, answer)
SELECT 'How will Girlzone AI appear on my bank statements?', 'We value your privacy. Any transactions appear under our discreet parent company, GirlzoneAI, so nothing on your bank statement will reveal your Girlzone AI experience.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

-- ========================================
-- Migration: 20240415_setup_faqs_table_final.sql
-- ========================================
-- Create FAQs table if it doesn't exist
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON faqs;
DROP POLICY IF EXISTS "Allow admin users full access" ON faqs;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON faqs;

-- Create policy for public read access
CREATE POLICY "Allow public read access" 
  ON faqs FOR SELECT 
  USING (true);

-- Insert some default FAQs if the table is empty
INSERT INTO faqs (question, answer)
SELECT 'What is Girlzone AI?', 'Girlzone AI is a platform that powers immersive experiences with AI companions. It allows users to create, customize, and interact with AI characters that can engage in conversation, generate images, and provide companionship.'
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

INSERT INTO faqs (question, answer)
SELECT 'Is Girlzone AI legit and safe?', 'Yes, Girlzone AI is legitimate and prioritizes user safety and privacy. All conversations are protected with SSL encryption, and we offer optional two-factor authentication to keep your account secure. Your personal information and interactions remain private.'
WHERE NOT EXISTS (SELECT 2 FROM faqs LIMIT 1 OFFSET 1);

INSERT INTO faqs (question, answer)
SELECT 'What is an AI Companion, and can I make my own?', 'An AI companion is a digital partner who can talk, react, flirt, and connect with you in real time. You can create your own companion from scratch or choose from a wide range of existing characters designed for different moods and personalities.'
WHERE NOT EXISTS (SELECT 3 FROM faqs LIMIT 1 OFFSET 2);

INSERT INTO faqs (question, answer)
SELECT 'Can I ask for pictures, videos, and voice?', 'Yes, your companion can send selfies, generate custom videos, or respond with their voice. You can request specific outfits, unique poses, or playful scenarios that match your fantasy. Your character will reflect the face, tone, and mood you''re craving.'
WHERE NOT EXISTS (SELECT 4 FROM faqs LIMIT 1 OFFSET 3);

INSERT INTO faqs (question, answer)
SELECT 'How will Girlzone AI appear on my bank statements?', 'We value your privacy. Any transactions appear under our discreet parent company, GirlzoneAI, so nothing on your bank statement will reveal your Girlzone AI experience.'
WHERE NOT EXISTS (SELECT 5 FROM faqs LIMIT 1 OFFSET 4);

-- ========================================
-- Migration: 20240415_update_faqs_rls.sql
-- ========================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON faqs;
DROP POLICY IF EXISTS "Allow admin users full access" ON faqs;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON faqs;

-- Create simple policies
-- Allow anyone to read FAQs
CREATE POLICY "Allow public read access" 
  ON faqs FOR SELECT 
  USING (true);

-- Allow service role to do anything (for admin API routes)
CREATE POLICY "Allow service role full access" 
  ON faqs FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- Migration: 20240612_create_delete_user_function.sql
-- ========================================
-- Create a function to delete users (requires admin privileges)
CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  calling_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Get the ID of the calling user
  calling_user_id := auth.uid();
  
  -- Check if the calling user is an admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = calling_user_id
  ) INTO is_admin;
  
  -- Only allow admins to delete users
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can delete users';
  END IF;
  
  -- Don't allow deleting yourself
  IF calling_user_id = user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;
  
  -- Don't allow deleting other admins
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = user_id) THEN
    RAISE EXCEPTION 'Cannot delete administrator accounts';
  END IF;
  
  -- Delete the user from auth.users
  -- This will cascade to delete related data due to foreign key constraints
  DELETE FROM auth.users WHERE id = user_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.delete_user IS 'Allows administrators to delete user accounts';

-- ========================================
-- Migration: 20240612_create_token_tables.sql
-- ========================================
-- Create user_tokens table to track token balances
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_tokens_user_id_key UNIQUE (user_id)
);

-- Create token_transactions table to track token usage and purchases
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  description TEXT,
  payment_id TEXT,
  image_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS user_tokens_user_id_idx ON user_tokens (user_id);
CREATE INDEX IF NOT EXISTS token_transactions_user_id_idx ON token_transactions (user_id);
CREATE INDEX IF NOT EXISTS token_transactions_created_at_idx ON token_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS token_transactions_type_idx ON token_transactions (type);

-- Enable Row Level Security
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own token balance
CREATE POLICY "Users can view their own token balance" 
  ON user_tokens FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for users to view their own token transactions
CREATE POLICY "Users can view their own token transactions" 
  ON token_transactions FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for server-side functions to manage token balances
CREATE POLICY "Server can manage token balances" 
  ON user_tokens FOR ALL 
  USING (true);

-- Create policy for server-side functions to manage token transactions
CREATE POLICY "Server can manage token transactions" 
  ON token_transactions FOR ALL 
  USING (true);

-- Create policy for admins to view all token data
CREATE POLICY "Admins can view all token balances" 
  ON user_tokens FOR SELECT 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.users.email IN (
      SELECT email FROM admin_users
    )
  ));

CREATE POLICY "Admins can view all token transactions" 
  ON token_transactions FOR SELECT 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.users.email IN (
      SELECT email FROM admin_users
    )
  ));

-- ========================================
-- Migration: 20240612_create_token_usage_function.sql
-- ========================================
-- Function to get token usage statistics
CREATE OR REPLACE FUNCTION get_token_usage_stats(
  p_user_id UUID,
  p_interval TEXT DEFAULT '7 days',
  p_date_format TEXT DEFAULT 'Dy'
)
RETURNS TABLE (
  name TEXT,
  tokens BIGINT,
  images BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT 
      date_trunc('day', generate_series(
        current_date - (p_interval::interval),
        current_date,
        '1 day'::interval
      )) AS day
  ),
  token_usage AS (
    SELECT
      date_trunc('day', created_at) AS day,
      SUM(ABS(amount)) AS tokens
    FROM token_transactions
    WHERE 
      user_id = p_user_id
      AND type = 'usage'
      AND created_at >= current_date - (p_interval::interval)
    GROUP BY 1
  ),
  image_counts AS (
    SELECT
      date_trunc('day', created_at) AS day,
      COUNT(*) AS images
    FROM generated_images
    WHERE 
      user_id = p_user_id
      AND created_at >= current_date - (p_interval::interval)
    GROUP BY 1
  )
  SELECT
    to_char(ds.day, p_date_format) AS name,
    COALESCE(tu.tokens, 0) AS tokens,
    COALESCE(ic.images, 0) AS images
  FROM date_series ds
  LEFT JOIN token_usage tu ON ds.day = tu.day
  LEFT JOIN image_counts ic ON ds.day = ic.day
  ORDER BY ds.day;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_token_usage_stats TO authenticated;

-- ========================================
-- Migration: 20240729_fix_character_rls.sql
-- ========================================
-- Drop any existing SELECT policy on the characters table
DROP POLICY IF EXISTS "Allow read access to all users" ON public.characters;

-- Create a new policy that allows read access to everyone
CREATE POLICY "Allow read access to all users"
ON public.characters FOR SELECT
USING (true);
-- ========================================
-- Migration: 20241201_create_call_tracking_tables.sql
-- ========================================
-- Create call_sessions table to track active calls
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID,
  call_id TEXT NOT NULL, -- External call ID from Bland AI
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'active', 'completed', 'failed')),
  tokens_charged INTEGER NOT NULL DEFAULT 0, -- Initial tokens charged
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 1, -- Initial estimate
  actual_duration_seconds INTEGER DEFAULT 0, -- Actual duration when call ends
  tokens_per_minute INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create call_billing table to track additional charges for long calls
CREATE TABLE IF NOT EXISTS call_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_type TEXT NOT NULL CHECK (billing_type IN ('initial', 'additional_minutes')),
  minutes_billed INTEGER NOT NULL,
  tokens_charged INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS call_sessions_user_id_idx ON call_sessions (user_id);
CREATE INDEX IF NOT EXISTS call_sessions_call_id_idx ON call_sessions (call_id);
CREATE INDEX IF NOT EXISTS call_sessions_status_idx ON call_sessions (status);
CREATE INDEX IF NOT EXISTS call_billing_call_session_id_idx ON call_billing (call_session_id);
CREATE INDEX IF NOT EXISTS call_billing_user_id_idx ON call_billing (user_id);

-- Enable Row Level Security
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_billing ENABLE ROW LEVEL SECURITY;

-- Create policies for users to view their own call data
CREATE POLICY "Users can view their own call sessions" 
  ON call_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own call billing" 
  ON call_billing FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policies for server-side functions to manage call data
CREATE POLICY "Server can manage call sessions" 
  ON call_sessions FOR ALL 
  USING (true);

CREATE POLICY "Server can manage call billing" 
  ON call_billing FOR ALL 
  USING (true);

-- Create policy for admins to view all call data
CREATE POLICY "Admins can view all call sessions" 
  ON call_sessions FOR SELECT 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.users.email IN (
      SELECT email FROM admin_users
    )
  ));

CREATE POLICY "Admins can view all call billing" 
  ON call_billing FOR SELECT 
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.users.email IN (
      SELECT email FROM admin_users
    )
  ));

-- ========================================
-- Migration: 20250115_add_earnings_tracking.sql
-- ========================================
-- Add earnings tracking to user_models table
ALTER TABLE user_models ADD COLUMN IF NOT EXISTS earnings_tokens INTEGER DEFAULT 0;
ALTER TABLE user_models ADD COLUMN IF NOT EXISTS earnings_usd DECIMAL(10,2) DEFAULT 0.00;

-- Create model_earnings table for tracking earnings from model usage
CREATE TABLE IF NOT EXISTS model_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  earnings_tokens INTEGER NOT NULL DEFAULT 0,
  earnings_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, model_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS model_earnings_user_id_idx ON model_earnings (user_id);
CREATE INDEX IF NOT EXISTS model_earnings_model_id_idx ON model_earnings (model_id);
CREATE INDEX IF NOT EXISTS model_earnings_last_earned_at_idx ON model_earnings (last_earned_at DESC);

-- Enable Row Level Security
ALTER TABLE model_earnings ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own earnings
CREATE POLICY "Users can view their own model earnings" 
  ON model_earnings FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for server-side functions to manage earnings
CREATE POLICY "Server can manage model earnings" 
  ON model_earnings FOR ALL 
  USING (true);

-- ========================================
-- Migration: 20250115_add_token_rate_setting.sql
-- ========================================
-- Add token-to-USD rate setting for withdrawals
INSERT INTO admin_settings (key, value, description) 
VALUES ('token_to_usd_rate', '0.01', 'Token to USD conversion rate for withdrawals (1 token = $0.01)')
ON CONFLICT (key) DO NOTHING;

-- Add withdrawal processing fee setting
INSERT INTO admin_settings (key, value, description) 
VALUES ('withdrawal_processing_fee_percent', '0', 'Processing fee percentage for withdrawals (0-100)')
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- Migration: 20250115_create_admin_settings_table.sql
-- ========================================
-- Create admin_settings table for admin configuration
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only admins can read admin settings
CREATE POLICY "Admins can read admin settings" 
  ON admin_settings FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Only admins can modify admin settings
CREATE POLICY "Admins can modify admin settings" 
  ON admin_settings FOR ALL 
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

-- Create indexes
CREATE INDEX IF NOT EXISTS admin_settings_key_idx ON admin_settings (key);

-- Insert default settings
INSERT INTO admin_settings (key, value, description) VALUES
('monetization_enabled', 'true', 'Enable or disable the monetization system'),
('token_to_usd_rate', '0.01', 'Token to USD conversion rate (1 token = $0.01)'),
('withdrawal_processing_fee_percent', '0', 'Processing fee percentage for withdrawals (0-100)'),
('minimum_withdrawal_amount', '10.00', 'Minimum amount required for withdrawal requests')
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- Migration: 20250115_create_models_table.sql
-- ========================================
-- Create models table for purchasable AI models
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  token_cost INTEGER NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_models table to track purchased models
CREATE TABLE IF NOT EXISTS user_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, model_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS models_category_idx ON models (category);
CREATE INDEX IF NOT EXISTS models_is_active_idx ON models (is_active);
CREATE INDEX IF NOT EXISTS user_models_user_id_idx ON user_models (user_id);
CREATE INDEX IF NOT EXISTS user_models_model_id_idx ON user_models (model_id);

-- Enable Row Level Security
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_models ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view active models
CREATE POLICY "Users can view active models" 
  ON models FOR SELECT 
  USING (is_active = true);

-- Create policy for users to view their own purchased models
CREATE POLICY "Users can view their own purchased models" 
  ON user_models FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own purchased models
CREATE POLICY "Users can purchase models" 
  ON user_models FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for server-side functions to manage models
CREATE POLICY "Server can manage models" 
  ON models FOR ALL 
  USING (true);

-- Create policy for server-side functions to manage user models
CREATE POLICY "Server can manage user models" 
  ON user_models FOR ALL 
  USING (true);

-- ========================================
-- Migration: 20250115_create_site_settings_table.sql
-- ========================================
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

-- ========================================
-- Migration: 20250115_create_usage_earnings_system.sql
-- ========================================
-- Create model_usage_logs table to track every time a model is used
CREATE TABLE IF NOT EXISTS model_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('image_generation', 'chat', 'other')),
  tokens_consumed INTEGER NOT NULL DEFAULT 0,
  earnings_generated DECIMAL(10,4) NOT NULL DEFAULT 0.00,
  usage_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create model_creator_earnings table to track total earnings per model
CREATE TABLE IF NOT EXISTS model_creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  total_usage_count INTEGER NOT NULL DEFAULT 0,
  total_tokens_consumed INTEGER NOT NULL DEFAULT 0,
  total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  last_usage_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(model_id)
);

-- Create earnings_transactions table for payout tracking
CREATE TABLE IF NOT EXISTS earnings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earnings', 'payout', 'bonus', 'adjustment')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payout_method TEXT,
  payout_reference TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create model_analytics table for detailed analytics
CREATE TABLE IF NOT EXISTS model_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  tokens_consumed INTEGER NOT NULL DEFAULT 0,
  earnings_generated DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  avg_usage_per_user DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(model_id, date)
);

-- Add creator_id to models table
ALTER TABLE models ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE models ADD COLUMN IF NOT EXISTS earnings_per_use DECIMAL(10,4) DEFAULT 0.01;
ALTER TABLE models ADD COLUMN IF NOT EXISTS earnings_per_token DECIMAL(10,4) DEFAULT 0.001;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS model_usage_logs_user_id_idx ON model_usage_logs (user_id);
CREATE INDEX IF NOT EXISTS model_usage_logs_model_id_idx ON model_usage_logs (model_id);
CREATE INDEX IF NOT EXISTS model_usage_logs_created_at_idx ON model_usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS model_usage_logs_usage_type_idx ON model_usage_logs (usage_type);

CREATE INDEX IF NOT EXISTS model_creator_earnings_model_id_idx ON model_creator_earnings (model_id);
CREATE INDEX IF NOT EXISTS model_creator_earnings_creator_id_idx ON model_creator_earnings (creator_id);
CREATE INDEX IF NOT EXISTS model_creator_earnings_total_earnings_idx ON model_creator_earnings (total_earnings DESC);

CREATE INDEX IF NOT EXISTS earnings_transactions_creator_id_idx ON earnings_transactions (creator_id);
CREATE INDEX IF NOT EXISTS earnings_transactions_model_id_idx ON earnings_transactions (model_id);
CREATE INDEX IF NOT EXISTS earnings_transactions_status_idx ON earnings_transactions (status);
CREATE INDEX IF NOT EXISTS earnings_transactions_created_at_idx ON earnings_transactions (created_at DESC);

CREATE INDEX IF NOT EXISTS model_analytics_model_id_idx ON model_analytics (model_id);
CREATE INDEX IF NOT EXISTS model_analytics_date_idx ON model_analytics (date DESC);
CREATE INDEX IF NOT EXISTS model_analytics_earnings_idx ON model_analytics (earnings_generated DESC);

-- Enable Row Level Security
ALTER TABLE model_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own usage logs
CREATE POLICY "Users can view their own usage logs" 
  ON model_usage_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- Creators can view earnings for their models
CREATE POLICY "Creators can view their model earnings" 
  ON model_creator_earnings FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM models 
      WHERE models.id = model_creator_earnings.model_id 
      AND models.creator_id = auth.uid()
    )
  );

-- Creators can view their earnings transactions
CREATE POLICY "Creators can view their earnings transactions" 
  ON earnings_transactions FOR SELECT 
  USING (auth.uid() = creator_id);

-- Creators can view analytics for their models
CREATE POLICY "Creators can view their model analytics" 
  ON model_analytics FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM models 
      WHERE models.id = model_analytics.model_id 
      AND models.creator_id = auth.uid()
    )
  );

-- Server-side functions can manage all earnings data
CREATE POLICY "Server can manage usage logs" 
  ON model_usage_logs FOR ALL 
  USING (true);

CREATE POLICY "Server can manage creator earnings" 
  ON model_creator_earnings FOR ALL 
  USING (true);

CREATE POLICY "Server can manage earnings transactions" 
  ON earnings_transactions FOR ALL 
  USING (true);

CREATE POLICY "Server can manage model analytics" 
  ON model_analytics FOR ALL 
  USING (true);

-- ========================================
-- Migration: 20250115_create_withdrawal_system.sql
-- ========================================
-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payout_method TEXT NOT NULL CHECK (payout_method IN ('stripe', 'paypal', 'bank_transfer', 'crypto')),
  payout_details JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')) DEFAULT 'pending',
  admin_notes TEXT,
  rejection_reason TEXT,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawal_request_items table to track which earnings are being withdrawn
CREATE TABLE IF NOT EXISTS withdrawal_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  earnings_transaction_id UUID NOT NULL REFERENCES earnings_transactions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawal_history table for audit trail
CREATE TABLE IF NOT EXISTS withdrawal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'approved', 'processing', 'completed', 'rejected', 'cancelled', 'updated')),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS withdrawal_requests_creator_id_idx ON withdrawal_requests (creator_id);
CREATE INDEX IF NOT EXISTS withdrawal_requests_status_idx ON withdrawal_requests (status);
CREATE INDEX IF NOT EXISTS withdrawal_requests_created_at_idx ON withdrawal_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawal_requests_amount_idx ON withdrawal_requests (amount DESC);

CREATE INDEX IF NOT EXISTS withdrawal_request_items_withdrawal_id_idx ON withdrawal_request_items (withdrawal_request_id);
CREATE INDEX IF NOT EXISTS withdrawal_request_items_earnings_id_idx ON withdrawal_request_items (earnings_transaction_id);

CREATE INDEX IF NOT EXISTS withdrawal_history_withdrawal_id_idx ON withdrawal_history (withdrawal_request_id);
CREATE INDEX IF NOT EXISTS withdrawal_history_created_at_idx ON withdrawal_history (created_at DESC);

-- Enable Row Level Security
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own withdrawal requests
CREATE POLICY "Users can view their own withdrawal requests" 
  ON withdrawal_requests FOR SELECT 
  USING (auth.uid() = creator_id);

-- Users can create their own withdrawal requests
CREATE POLICY "Users can create their own withdrawal requests" 
  ON withdrawal_requests FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

-- Users can update their own pending withdrawal requests
CREATE POLICY "Users can update their own pending withdrawal requests" 
  ON withdrawal_requests FOR UPDATE 
  USING (auth.uid() = creator_id AND status = 'pending')
  WITH CHECK (auth.uid() = creator_id);

-- Users can view their own withdrawal request items
CREATE POLICY "Users can view their own withdrawal request items" 
  ON withdrawal_request_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM withdrawal_requests 
      WHERE withdrawal_requests.id = withdrawal_request_items.withdrawal_request_id 
      AND withdrawal_requests.creator_id = auth.uid()
    )
  );

-- Users can create withdrawal request items for their own requests
CREATE POLICY "Users can create their own withdrawal request items" 
  ON withdrawal_request_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM withdrawal_requests 
      WHERE withdrawal_requests.id = withdrawal_request_items.withdrawal_request_id 
      AND withdrawal_requests.creator_id = auth.uid()
    )
  );

-- Users can view their own withdrawal history
CREATE POLICY "Users can view their own withdrawal history" 
  ON withdrawal_history FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM withdrawal_requests 
      WHERE withdrawal_requests.id = withdrawal_history.withdrawal_request_id 
      AND withdrawal_requests.creator_id = auth.uid()
    )
  );

-- Admins can manage all withdrawal requests
CREATE POLICY "Admins can manage all withdrawal requests" 
  ON withdrawal_requests FOR ALL 
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

-- Admins can manage all withdrawal request items
CREATE POLICY "Admins can manage all withdrawal request items" 
  ON withdrawal_request_items FOR ALL 
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

-- Admins can manage all withdrawal history
CREATE POLICY "Admins can manage all withdrawal history" 
  ON withdrawal_history FOR ALL 
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

-- Add minimum withdrawal amount setting
INSERT INTO admin_settings (key, value, description) 
VALUES ('minimum_withdrawal_amount', '10.00', 'Minimum amount required for withdrawal requests')
ON CONFLICT (key) DO NOTHING;

-- Add withdrawal processing fee setting
INSERT INTO admin_settings (key, value, description) 
VALUES ('withdrawal_processing_fee', '0.00', 'Processing fee for withdrawal requests')
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- Migration: 20250115_enhance_collections_cloudinary.sql
-- ========================================
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

-- ========================================
-- Migration: 20250115_enhance_token_transactions.sql
-- ========================================
-- Add balance tracking columns to token_transactions
ALTER TABLE token_transactions 
ADD COLUMN IF NOT EXISTS balance_before INTEGER,
ADD COLUMN IF NOT EXISTS balance_after INTEGER;

-- Update token_transactions type enum to include new types dynamically
-- ensuring we don't break existing data with unknown types
DO $$ 
DECLARE
  existing_types TEXT[];
  new_constraint_def TEXT;
  required_types TEXT[] := ARRAY[
    'purchase', 
    'usage', 
    'refund', 
    'bonus', 
    'recharge', 
    'subscription_bonus', 
    'subscription_grant',
    'chat_consumption', 
    'voice_call_consumption', 
    'image_generation', 
    'video_generation', 
    'manual_adjustment', 
    'refund_reversal'
  ];
  t TEXT;
BEGIN
  -- Get all unique transaction types currently in the table
  SELECT array_agg(DISTINCT type) INTO existing_types
  FROM token_transactions;
  
  RAISE NOTICE 'Existing transaction types: %', existing_types;
  
  -- Drop the existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'token_transactions_type_check'
  ) THEN
    ALTER TABLE token_transactions DROP CONSTRAINT token_transactions_type_check;
    RAISE NOTICE 'Dropped existing constraint';
  END IF;
  
  -- Start with required types
  new_constraint_def := '';
  FOREACH t IN ARRAY required_types LOOP
    IF new_constraint_def != '' THEN
      new_constraint_def := new_constraint_def || ', ';
    END IF;
    new_constraint_def := new_constraint_def || '''' || t || '''';
  END LOOP;
  
  -- Add any existing types that aren't in our required list
  IF existing_types IS NOT NULL THEN
    FOREACH t IN ARRAY existing_types LOOP
      IF NOT (t = ANY(required_types)) THEN
        new_constraint_def := new_constraint_def || ', ''' || t || '''';
        RAISE NOTICE 'Adding existing custom type to constraint: %', t;
      END IF;
    END LOOP;
  END IF;
  
  -- Create the new constraint with all types
  EXECUTE format(
    'ALTER TABLE token_transactions ADD CONSTRAINT token_transactions_type_check CHECK (type IN (%s))',
    new_constraint_def
  );
  
  RAISE NOTICE 'Created new constraint with types: %', new_constraint_def;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating constraint: %. Continuing anyway...', SQLERRM;
END $$;

-- Create function to automatically calculate balances on insert
CREATE OR REPLACE FUNCTION update_token_transaction_balances()
RETURNS TRIGGER AS $$
DECLARE
  current_user_balance INTEGER;
BEGIN
  -- Get the current balance from user_tokens
  -- Note: This assumes user_tokens has already been updated if the update happened before insert
  SELECT balance INTO current_user_balance
  FROM user_tokens
  WHERE user_id = NEW.user_id;

  -- If no user_tokens record exists, assume 0
  IF current_user_balance IS NULL THEN
    current_user_balance := 0;
  END IF;

  -- Set the balance_after to the current balance
  NEW.balance_after := current_user_balance;
  
  -- Calculate balance_before based on the transaction amount
  -- balance_after = balance_before + amount
  -- therefore: balance_before = balance_after - amount
  NEW.balance_before := current_user_balance - NEW.amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before insert
DROP TRIGGER IF EXISTS set_token_transaction_balances ON token_transactions;

CREATE TRIGGER set_token_transaction_balances
BEFORE INSERT ON token_transactions
FOR EACH ROW
EXECUTE FUNCTION update_token_transaction_balances();

-- ========================================
-- Migration: 20250115_seed_models.sql
-- ========================================
-- Insert available models for purchase
INSERT INTO models (name, description, category, token_cost, is_premium, features) VALUES
('Stability AI Pro', 'High-quality image generation with advanced control', 'Image Generation', 0, false, '{"quality": "high", "speed": "fast", "control": "advanced"}'),
('FLUX Pro', 'Next-generation image generation with superior quality', 'Image Generation', 0, false, '{"quality": "superior", "speed": "medium", "control": "basic"}'),
('Anime Style v2', 'Enhanced anime character generation with better details', 'Anime', 50, true, '{"style": "anime", "quality": "enhanced", "details": "high"}'),
('Realistic Portrait Pro', 'Professional-grade realistic human portraits', 'Realistic', 75, true, '{"style": "realistic", "quality": "professional", "details": "photorealistic"}'),
('Fantasy Art Master', 'Epic fantasy characters and creatures', 'Fantasy', 60, true, '{"style": "fantasy", "quality": "epic", "creatures": "detailed"}'),
('Cyberpunk Style', 'Futuristic cyberpunk aesthetics and environments', 'Sci-Fi', 55, true, '{"style": "cyberpunk", "quality": "futuristic", "environments": "detailed"}'),
('Oil Painting Classic', 'Classical oil painting style with artistic flair', 'Artistic', 45, true, '{"style": "oil_painting", "quality": "classical", "artistic": "high"}'),
('Manga Style Pro', 'Traditional manga art with professional quality', 'Anime', 40, true, '{"style": "manga", "quality": "professional", "traditional": "authentic"}'),
('Character Creator Pro', 'Advanced character creation with multiple styles', 'Character', 100, true, '{"styles": "multiple", "quality": "advanced", "customization": "extensive"}'),
('Environment Master', 'Detailed environment and background generation', 'Environment', 80, true, '{"environments": "detailed", "quality": "high", "variety": "extensive"}');

-- ========================================
-- Migration: 20250115_update_earnings_transactions.sql
-- ========================================
-- Update earnings_transactions table to support additional transaction types
ALTER TABLE earnings_transactions 
DROP CONSTRAINT IF EXISTS earnings_transactions_transaction_type_check;

ALTER TABLE earnings_transactions 
ADD CONSTRAINT earnings_transactions_transaction_type_check 
CHECK (transaction_type IN ('earnings', 'payout', 'bonus', 'adjustment', 'refund', 'correction', 'reward'));

-- Add admin attribution fields to earnings_transactions
ALTER TABLE earnings_transactions 
ADD COLUMN IF NOT EXISTS added_by_admin UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE earnings_transactions 
ADD COLUMN IF NOT EXISTS admin_email TEXT;

-- Update the metadata to include admin information
COMMENT ON COLUMN earnings_transactions.added_by_admin IS 'Admin user ID who added this earnings transaction';
COMMENT ON COLUMN earnings_transactions.admin_email IS 'Email of the admin who added this earnings transaction';

-- Create index for admin attribution
CREATE INDEX IF NOT EXISTS earnings_transactions_added_by_admin_idx ON earnings_transactions (added_by_admin);

-- Update RLS policies to allow admins to view all earnings transactions
CREATE POLICY "Admins can view all earnings transactions" 
  ON earnings_transactions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Allow admins to insert earnings transactions
CREATE POLICY "Admins can insert earnings transactions" 
  ON earnings_transactions FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Allow admins to update earnings transactions
CREATE POLICY "Admins can update earnings transactions" 
  ON earnings_transactions FOR UPDATE 
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

-- ========================================
-- Migration: 20250122_subscription_monthly_tokens.sql
-- ========================================
-- =====================================================
-- SUBSCRIPTION MONTHLY TOKEN GRANTS SYSTEM
-- =====================================================
-- This migration creates a system to automatically grant
-- 100 tokens per month to active subscribers
-- =====================================================

-- Step 1: Create table to track monthly token grants
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_token_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_month DATE NOT NULL, -- First day of the month for which tokens were granted
  tokens_granted INTEGER NOT NULL DEFAULT 100,
  subscription_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  plan_name TEXT,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, grant_month) -- Ensure only one grant per user per month
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS subscription_token_grants_user_id_idx ON subscription_token_grants (user_id);
CREATE INDEX IF NOT EXISTS subscription_token_grants_grant_month_idx ON subscription_token_grants (grant_month);
CREATE INDEX IF NOT EXISTS subscription_token_grants_created_at_idx ON subscription_token_grants (created_at DESC);

-- Enable Row Level Security
ALTER TABLE subscription_token_grants ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own grants
CREATE POLICY "Users can view their own token grants" 
  ON subscription_token_grants FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for server-side functions to manage grants
CREATE POLICY "Server can manage token grants" 
  ON subscription_token_grants FOR ALL 
  USING (true);

-- =====================================================
-- Step 2: Update token_transactions type enum to include 'subscription_grant'
-- =====================================================
-- First, check if the type constraint exists and drop it
DO $$ 
BEGIN
  -- Drop the existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'token_transactions_type_check'
  ) THEN
    ALTER TABLE token_transactions DROP CONSTRAINT token_transactions_type_check;
  END IF;
END $$;

-- Add the new constraint with 'subscription_grant' included
ALTER TABLE token_transactions 
  ADD CONSTRAINT token_transactions_type_check 
  CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'subscription_grant'));

-- =====================================================
-- Step 3: Create function to grant tokens to active subscribers
-- =====================================================
CREATE OR REPLACE FUNCTION grant_monthly_tokens_to_subscribers()
RETURNS TABLE (
  user_id UUID,
  tokens_granted INTEGER,
  subscription_status TEXT,
  message TEXT
) AS $$
DECLARE
  v_current_month DATE;
  v_tokens_per_month INTEGER := 100;
  v_user_record RECORD;
  v_granted_count INTEGER := 0;
BEGIN
  -- Get the first day of the current month
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  RAISE NOTICE 'Starting monthly token grant process for month: %', v_current_month;
  
  -- Find all active subscribers who haven't received tokens this month
  FOR v_user_record IN
    WITH active_subscriptions AS (
      -- Get active subscriptions from payment_transactions
      SELECT DISTINCT ON (pt.user_id)
        pt.user_id,
        pt.plan_name,
        pt.plan_id,
        pt.plan_duration,
        pt.created_at as subscription_start,
        (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at
      FROM payment_transactions pt
      WHERE pt.status = 'completed'
        AND pt.plan_id IS NOT NULL
        AND (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW()
      ORDER BY pt.user_id, pt.created_at DESC
    )
    SELECT 
      s.user_id,
      s.plan_name,
      s.plan_id,
      s.expires_at
    FROM active_subscriptions s
    WHERE NOT EXISTS (
      -- Check if tokens were already granted this month
      SELECT 1 
      FROM subscription_token_grants stg
      WHERE stg.user_id = s.user_id 
        AND stg.grant_month = v_current_month
    )
  LOOP
    BEGIN
      -- Insert grant record
      INSERT INTO subscription_token_grants (
        user_id,
        grant_month,
        tokens_granted,
        subscription_expires_at,
        plan_name,
        plan_id
      ) VALUES (
        v_user_record.user_id,
        v_current_month,
        v_tokens_per_month,
        v_user_record.expires_at,
        v_user_record.plan_name,
        v_user_record.plan_id
      );
      
      -- Update user token balance
      INSERT INTO user_tokens (user_id, balance, created_at, updated_at)
      VALUES (
        v_user_record.user_id,
        v_tokens_per_month,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_tokens.balance + v_tokens_per_month,
        updated_at = NOW();
      
      -- Record transaction
      INSERT INTO token_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        created_at
      ) VALUES (
        v_user_record.user_id,
        v_tokens_per_month,
        'subscription_grant',
        'Monthly subscription tokens for ' || TO_CHAR(v_current_month, 'Month YYYY'),
        jsonb_build_object(
          'grant_month', v_current_month,
          'plan_name', v_user_record.plan_name,
          'expires_at', v_user_record.expires_at
        ),
        NOW()
      );
      
      v_granted_count := v_granted_count + 1;
      
      -- Return result for this user
      user_id := v_user_record.user_id;
      tokens_granted := v_tokens_per_month;
      subscription_status := 'active';
      message := 'Successfully granted ' || v_tokens_per_month || ' tokens';
      RETURN NEXT;
      
      RAISE NOTICE 'Granted % tokens to user %', v_tokens_per_month, v_user_record.user_id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other users
      RAISE WARNING 'Failed to grant tokens to user %: %', v_user_record.user_id, SQLERRM;
      
      user_id := v_user_record.user_id;
      tokens_granted := 0;
      subscription_status := 'error';
      message := 'Error: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
  
  RAISE NOTICE 'Monthly token grant completed. Total users granted: %', v_granted_count;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Step 4: Create function to grant tokens for a specific user
-- =====================================================
CREATE OR REPLACE FUNCTION grant_tokens_to_subscriber(p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  tokens_granted INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_month DATE;
  v_tokens_per_month INTEGER := 100;
  v_subscription RECORD;
BEGIN
  -- Get the first day of the current month
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Check if user has an active subscription
  SELECT 
    pt.user_id,
    pt.plan_name,
    pt.plan_id,
    pt.plan_duration,
    pt.created_at as subscription_start,
    (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at
  INTO v_subscription
  FROM payment_transactions pt
  WHERE pt.user_id = p_user_id
    AND pt.status = 'completed'
    AND pt.plan_id IS NOT NULL
    AND (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW()
  ORDER BY pt.created_at DESC
  LIMIT 1;
  
  IF v_subscription.user_id IS NULL THEN
    success := false;
    tokens_granted := 0;
    message := 'No active subscription found for this user';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if tokens were already granted this month
  IF EXISTS (
    SELECT 1 
    FROM subscription_token_grants 
    WHERE user_id = p_user_id 
      AND grant_month = v_current_month
  ) THEN
    success := false;
    tokens_granted := 0;
    message := 'Tokens already granted for this month';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Grant tokens
  BEGIN
    -- Insert grant record
    INSERT INTO subscription_token_grants (
      user_id,
      grant_month,
      tokens_granted,
      subscription_expires_at,
      plan_name,
      plan_id
    ) VALUES (
      p_user_id,
      v_current_month,
      v_tokens_per_month,
      v_subscription.expires_at,
      v_subscription.plan_name,
      v_subscription.plan_id
    );
    
    -- Update user token balance
    INSERT INTO user_tokens (user_id, balance, created_at, updated_at)
    VALUES (p_user_id, v_tokens_per_month, NOW(), NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = user_tokens.balance + v_tokens_per_month,
      updated_at = NOW();
    
    -- Record transaction
    INSERT INTO token_transactions (
      user_id,
      amount,
      type,
      description,
      metadata,
      created_at
    ) VALUES (
      p_user_id,
      v_tokens_per_month,
      'subscription_grant',
      'Monthly subscription tokens for ' || TO_CHAR(v_current_month, 'Month YYYY'),
      jsonb_build_object(
        'grant_month', v_current_month,
        'plan_name', v_subscription.plan_name,
        'expires_at', v_subscription.expires_at
      ),
      NOW()
    );
    
    success := true;
    tokens_granted := v_tokens_per_month;
    message := 'Successfully granted ' || v_tokens_per_month || ' tokens';
    RETURN NEXT;
    
  EXCEPTION WHEN OTHERS THEN
    success := false;
    tokens_granted := 0;
    message := 'Error: ' || SQLERRM;
    RETURN NEXT;
  END;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Step 5: Create function to check subscription token status
-- =====================================================
CREATE OR REPLACE FUNCTION check_subscription_token_status(p_user_id UUID)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  plan_name TEXT,
  tokens_granted_this_month BOOLEAN,
  last_grant_date DATE,
  tokens_granted INTEGER,
  current_token_balance INTEGER
) AS $$
DECLARE
  v_current_month DATE;
BEGIN
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  RETURN QUERY
  WITH active_sub AS (
    SELECT 
      pt.user_id,
      pt.plan_name,
      (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at
    FROM payment_transactions pt
    WHERE pt.user_id = p_user_id
      AND pt.status = 'completed'
      AND pt.plan_id IS NOT NULL
      AND (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW()
    ORDER BY pt.created_at DESC
    LIMIT 1
  ),
  last_grant AS (
    SELECT 
      grant_month,
      tokens_granted
    FROM subscription_token_grants
    WHERE user_id = p_user_id
    ORDER BY grant_month DESC
    LIMIT 1
  ),
  token_balance AS (
    SELECT balance
    FROM user_tokens
    WHERE user_id = p_user_id
  )
  SELECT 
    (active_sub.user_id IS NOT NULL) as has_active_subscription,
    active_sub.expires_at as subscription_expires_at,
    active_sub.plan_name as plan_name,
    EXISTS (
      SELECT 1 
      FROM subscription_token_grants 
      WHERE user_id = p_user_id 
        AND grant_month = v_current_month
    ) as tokens_granted_this_month,
    last_grant.grant_month as last_grant_date,
    last_grant.tokens_granted as tokens_granted,
    COALESCE(token_balance.balance, 0) as current_token_balance
  FROM active_sub
  LEFT JOIN last_grant ON true
  LEFT JOIN token_balance ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Step 6: Grant immediate permissions for pg_cron extension (if available)
-- =====================================================
-- Note: pg_cron may need to be enabled by your database administrator
-- To enable: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- To use this system:
--
-- 1. Grant tokens to all active subscribers for current month:
--    SELECT * FROM grant_monthly_tokens_to_subscribers();
--
-- 2. Grant tokens to a specific user:
--    SELECT * FROM grant_tokens_to_subscriber('user-uuid-here');
--
-- 3. Check a user's subscription token status:
--    SELECT * FROM check_subscription_token_status('user-uuid-here');
--
-- 4. View all token grants:
--    SELECT * FROM subscription_token_grants ORDER BY created_at DESC;
--
-- 5. Set up monthly automation (requires pg_cron):
--    See the separate automation file
-- =====================================================

-- ========================================
-- Migration: 20250122_subscription_monthly_tokens_FIXED.sql
-- ========================================
-- =====================================================
-- SUBSCRIPTION MONTHLY TOKEN GRANTS SYSTEM - FIXED VERSION
-- =====================================================
-- This migration creates a system to automatically grant
-- 500 tokens per month to active subscribers
-- =====================================================

-- Step 1: Create table to track monthly token grants
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_token_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_month DATE NOT NULL, -- First day of the month for which tokens were granted
  tokens_granted INTEGER NOT NULL DEFAULT 500,
  subscription_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  plan_name TEXT,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, grant_month) -- Ensure only one grant per user per month
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS subscription_token_grants_user_id_idx ON subscription_token_grants (user_id);
CREATE INDEX IF NOT EXISTS subscription_token_grants_grant_month_idx ON subscription_token_grants (grant_month);
CREATE INDEX IF NOT EXISTS subscription_token_grants_created_at_idx ON subscription_token_grants (created_at DESC);

-- Enable Row Level Security
ALTER TABLE subscription_token_grants ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own grants
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscription_token_grants' 
    AND policyname = 'Users can view their own token grants'
  ) THEN
    CREATE POLICY "Users can view their own token grants" 
      ON subscription_token_grants FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policy for server-side functions to manage grants
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscription_token_grants' 
    AND policyname = 'Server can manage token grants'
  ) THEN
    CREATE POLICY "Server can manage token grants" 
      ON subscription_token_grants FOR ALL 
      USING (true);
  END IF;
END $$;

-- =====================================================
-- Step 2: Update token_transactions type enum to include 'subscription_grant'
-- =====================================================
-- FIXED: Check existing data first and handle gracefully
DO $$ 
DECLARE
  existing_types TEXT[];
  new_constraint_def TEXT;
BEGIN
  -- Get all unique transaction types currently in the table
  SELECT array_agg(DISTINCT type) INTO existing_types
  FROM token_transactions;
  
  RAISE NOTICE 'Existing transaction types: %', existing_types;
  
  -- Drop the existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'token_transactions_type_check'
  ) THEN
    ALTER TABLE token_transactions DROP CONSTRAINT token_transactions_type_check;
    RAISE NOTICE 'Dropped existing constraint';
  END IF;
  
  -- Build new constraint that includes all existing types plus new ones
  -- Standard types: purchase, usage, refund, bonus
  -- New type: subscription_grant
  -- Also include any custom types that might exist
  new_constraint_def := 'purchase', 'usage', 'refund', 'bonus', 'subscription_grant';
  
  -- Add any existing types that aren't in our standard list
  IF existing_types IS NOT NULL THEN
    FOR i IN 1..array_length(existing_types, 1) LOOP
      IF existing_types[i] NOT IN ('purchase', 'usage', 'refund', 'bonus', 'subscription_grant') THEN
        new_constraint_def := new_constraint_def || ', ''' || existing_types[i] || '''';
        RAISE NOTICE 'Adding existing custom type to constraint: %', existing_types[i];
      END IF;
    END LOOP;
  END IF;
  
  -- Create the new constraint with all types
  EXECUTE format(
    'ALTER TABLE token_transactions ADD CONSTRAINT token_transactions_type_check CHECK (type IN (%s))',
    new_constraint_def
  );
  
  RAISE NOTICE 'Created new constraint with types: %', new_constraint_def;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating constraint: %. Continuing anyway...', SQLERRM;
END $$;

-- =====================================================
-- Step 3: Create function to grant tokens to active subscribers
-- =====================================================
CREATE OR REPLACE FUNCTION grant_monthly_tokens_to_subscribers()
RETURNS TABLE (
  user_id UUID,
  tokens_granted INTEGER,
  subscription_status TEXT,
  message TEXT
) AS $$
DECLARE
  v_current_month DATE;
  v_tokens_per_month INTEGER := 500;
  v_user_record RECORD;
  v_granted_count INTEGER := 0;
BEGIN
  -- Get the first day of the current month
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  RAISE NOTICE 'Starting monthly token grant process for month: %', v_current_month;
  
  -- Find all active subscribers who haven't received tokens this month
  FOR v_user_record IN
    WITH active_subscriptions AS (
      -- Get active subscriptions from payment_transactions
      SELECT DISTINCT ON (pt.user_id)
        pt.user_id,
        pt.plan_name,
        pt.plan_id,
        pt.plan_duration,
        pt.created_at as subscription_start,
        (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at
      FROM payment_transactions pt
      WHERE pt.status = 'completed'
        AND pt.plan_id IS NOT NULL
        AND (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW()
      ORDER BY pt.user_id, pt.created_at DESC
    )
    SELECT 
      s.user_id,
      s.plan_name,
      s.plan_id,
      s.expires_at
    FROM active_subscriptions s
    WHERE NOT EXISTS (
      -- Check if tokens were already granted this month
      SELECT 1 
      FROM subscription_token_grants stg
      WHERE stg.user_id = s.user_id 
        AND stg.grant_month = v_current_month
    )
  LOOP
    BEGIN
      -- Insert grant record
      INSERT INTO subscription_token_grants (
        user_id,
        grant_month,
        tokens_granted,
        subscription_expires_at,
        plan_name,
        plan_id
      ) VALUES (
        v_user_record.user_id,
        v_current_month,
        v_tokens_per_month,
        v_user_record.expires_at,
        v_user_record.plan_name,
        v_user_record.plan_id
      );
      
      -- Update user token balance
      INSERT INTO user_tokens (user_id, balance, created_at, updated_at)
      VALUES (
        v_user_record.user_id,
        v_tokens_per_month,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_tokens.balance + v_tokens_per_month,
        updated_at = NOW();
      
      -- Record transaction
      INSERT INTO token_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        created_at
      ) VALUES (
        v_user_record.user_id,
        v_tokens_per_month,
        'subscription_grant',
        'Monthly subscription tokens for ' || TO_CHAR(v_current_month, 'Month YYYY'),
        jsonb_build_object(
          'grant_month', v_current_month,
          'plan_name', v_user_record.plan_name,
          'expires_at', v_user_record.expires_at
        ),
        NOW()
      );
      
      v_granted_count := v_granted_count + 1;
      
      -- Return result for this user
      user_id := v_user_record.user_id;
      tokens_granted := v_tokens_per_month;
      subscription_status := 'active';
      message := 'Successfully granted ' || v_tokens_per_month || ' tokens';
      RETURN NEXT;
      
      RAISE NOTICE 'Granted % tokens to user %', v_tokens_per_month, v_user_record.user_id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other users
      RAISE WARNING 'Failed to grant tokens to user %: %', v_user_record.user_id, SQLERRM;
      
      user_id := v_user_record.user_id;
      tokens_granted := 0;
      subscription_status := 'error';
      message := 'Error: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
  
  RAISE NOTICE 'Monthly token grant completed. Total users granted: %', v_granted_count;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Step 4: Create function to grant tokens for a specific user
-- =====================================================
CREATE OR REPLACE FUNCTION grant_tokens_to_subscriber(p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  tokens_granted INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_month DATE;
  v_tokens_per_month INTEGER := 500;
  v_subscription RECORD;
BEGIN
  -- Get the first day of the current month
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Check if user has an active subscription
  SELECT 
    pt.user_id,
    pt.plan_name,
    pt.plan_id,
    pt.plan_duration,
    pt.created_at as subscription_start,
    (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at
  INTO v_subscription
  FROM payment_transactions pt
  WHERE pt.user_id = p_user_id
    AND pt.status = 'completed'
    AND pt.plan_id IS NOT NULL
    AND (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW()
  ORDER BY pt.created_at DESC
  LIMIT 1;
  
  IF v_subscription.user_id IS NULL THEN
    success := false;
    tokens_granted := 0;
    message := 'No active subscription found for this user';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if tokens were already granted this month
  IF EXISTS (
    SELECT 1 
    FROM subscription_token_grants 
    WHERE user_id = p_user_id 
      AND grant_month = v_current_month
  ) THEN
    success := false;
    tokens_granted := 0;
    message := 'Tokens already granted for this month';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Grant tokens
  BEGIN
    -- Insert grant record
    INSERT INTO subscription_token_grants (
      user_id,
      grant_month,
      tokens_granted,
      subscription_expires_at,
      plan_name,
      plan_id
    ) VALUES (
      p_user_id,
      v_current_month,
      v_tokens_per_month,
      v_subscription.expires_at,
      v_subscription.plan_name,
      v_subscription.plan_id
    );
    
    -- Update user token balance
    INSERT INTO user_tokens (user_id, balance, created_at, updated_at)
    VALUES (p_user_id, v_tokens_per_month, NOW(), NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = user_tokens.balance + v_tokens_per_month,
      updated_at = NOW();
    
    -- Record transaction
    INSERT INTO token_transactions (
      user_id,
      amount,
      type,
      description,
      metadata,
      created_at
    ) VALUES (
      p_user_id,
      v_tokens_per_month,
      'subscription_grant',
      'Monthly subscription tokens for ' || TO_CHAR(v_current_month, 'Month YYYY'),
      jsonb_build_object(
        'grant_month', v_current_month,
        'plan_name', v_subscription.plan_name,
        'expires_at', v_subscription.expires_at
      ),
      NOW()
    );
    
    success := true;
    tokens_granted := v_tokens_per_month;
    message := 'Successfully granted ' || v_tokens_per_month || ' tokens';
    RETURN NEXT;
    
  EXCEPTION WHEN OTHERS THEN
    success := false;
    tokens_granted := 0;
    message := 'Error: ' || SQLERRM;
    RETURN NEXT;
  END;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Step 5: Create function to check subscription token status
-- =====================================================
CREATE OR REPLACE FUNCTION check_subscription_token_status(p_user_id UUID)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  plan_name TEXT,
  tokens_granted_this_month BOOLEAN,
  last_grant_date DATE,
  tokens_granted INTEGER,
  current_token_balance INTEGER
) AS $$
DECLARE
  v_current_month DATE;
BEGIN
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  RETURN QUERY
  WITH active_sub AS (
    SELECT 
      pt.user_id,
      pt.plan_name,
      (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at
    FROM payment_transactions pt
    WHERE pt.user_id = p_user_id
      AND pt.status = 'completed'
      AND pt.plan_id IS NOT NULL
      AND (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW()
    ORDER BY pt.created_at DESC
    LIMIT 1
  ),
  last_grant AS (
    SELECT 
      grant_month,
      tokens_granted
    FROM subscription_token_grants
    WHERE user_id = p_user_id
    ORDER BY grant_month DESC
    LIMIT 1
  ),
  token_balance AS (
    SELECT balance
    FROM user_tokens
    WHERE user_id = p_user_id
  )
  SELECT 
    (active_sub.user_id IS NOT NULL) as has_active_subscription,
    active_sub.expires_at as subscription_expires_at,
    active_sub.plan_name as plan_name,
    EXISTS (
      SELECT 1 
      FROM subscription_token_grants 
      WHERE user_id = p_user_id 
        AND grant_month = v_current_month
    ) as tokens_granted_this_month,
    last_grant.grant_month as last_grant_date,
    last_grant.tokens_granted as tokens_granted,
    COALESCE(token_balance.balance, 0) as current_token_balance
  FROM active_sub
  LEFT JOIN last_grant ON true
  LEFT JOIN token_balance ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- To use this system:
--
-- 1. Grant tokens to all active subscribers for current month:
--    SELECT * FROM grant_monthly_tokens_to_subscribers();
--
-- 2. Grant tokens to a specific user:
--    SELECT * FROM grant_tokens_to_subscriber('user-uuid-here');
--
-- 3. Check a user's subscription token status:
--    SELECT * FROM check_subscription_token_status('user-uuid-here');
--
-- 4. View all token grants:
--    SELECT * FROM subscription_token_grants ORDER BY created_at DESC;
-- =====================================================


-- ========================================
-- Migration: 20250122_subscription_tokens_automation.sql
-- ========================================
-- =====================================================
-- SUBSCRIPTION MONTHLY TOKEN GRANTS - AUTOMATION SETUP
-- =====================================================
-- This file sets up automatic monthly token grants
-- using pg_cron (PostgreSQL job scheduler)
-- =====================================================

-- =====================================================
-- Option 1: Using pg_cron (Recommended for Supabase Pro and above)
-- =====================================================

-- First, enable the pg_cron extension
-- Note: This requires superuser privileges or must be done via Supabase dashboard
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the monthly token grant job
-- Runs on the 1st day of every month at 00:00 UTC
SELECT cron.schedule(
  'grant-monthly-subscription-tokens',  -- Job name
  '0 0 1 * *',                          -- Cron expression: At 00:00 on day 1 of every month
  $$SELECT * FROM grant_monthly_tokens_to_subscribers();$$
);

-- =====================================================
-- View scheduled jobs
-- =====================================================
-- To see all scheduled cron jobs:
-- SELECT * FROM cron.job;

-- To see job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- =====================================================
-- Option 2: Manual Execution (If pg_cron is not available)
-- =====================================================

-- If you don't have pg_cron, you'll need to run this manually
-- each month or set up an external cron job/scheduled task that calls
-- an API endpoint which executes the function.

-- To manually grant tokens for the current month:
-- SELECT * FROM grant_monthly_tokens_to_subscribers();

-- =====================================================
-- Option 3: Edge Function Trigger (Alternative)
-- =====================================================

-- You can also create a Supabase Edge Function that calls this
-- and trigger it via:
-- 1. GitHub Actions scheduled workflow
-- 2. External cron service (e.g., cron-job.org, EasyCron)
-- 3. Vercel/Netlify scheduled functions
-- 4. Cloud provider schedulers (AWS EventBridge, GCP Cloud Scheduler)

-- Example API endpoint code would call:
-- SELECT * FROM grant_monthly_tokens_to_subscribers();

-- =====================================================
-- Monitoring and Maintenance
-- =====================================================

-- View all token grants for current month
CREATE OR REPLACE VIEW current_month_token_grants AS
SELECT 
  stg.user_id,
  au.email,
  stg.tokens_granted,
  stg.plan_name,
  stg.subscription_expires_at,
  stg.created_at,
  ut.balance as current_balance
FROM subscription_token_grants stg
JOIN auth.users au ON stg.user_id = au.id
LEFT JOIN user_tokens ut ON stg.user_id = ut.user_id
WHERE stg.grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
ORDER BY stg.created_at DESC;

-- View users with active subscriptions who haven't received tokens this month
CREATE OR REPLACE VIEW pending_token_grants AS
WITH active_subscriptions AS (
  SELECT DISTINCT ON (pt.user_id)
    pt.user_id,
    au.email,
    pt.plan_name,
    pt.created_at as subscription_start,
    (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at
  FROM payment_transactions pt
  JOIN auth.users au ON pt.user_id = au.id
  WHERE pt.status = 'completed'
    AND pt.plan_id IS NOT NULL
    AND (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW()
  ORDER BY pt.user_id, pt.created_at DESC
)
SELECT 
  s.user_id,
  s.email,
  s.plan_name,
  s.subscription_start,
  s.expires_at,
  DATE_TRUNC('month', CURRENT_DATE)::DATE as pending_for_month
FROM active_subscriptions s
WHERE NOT EXISTS (
  SELECT 1 
  FROM subscription_token_grants stg
  WHERE stg.user_id = s.user_id 
    AND stg.grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
);

-- =====================================================
-- Cleanup old grant records (optional maintenance)
-- =====================================================

-- Create function to clean up old token grant records (older than 12 months)
CREATE OR REPLACE FUNCTION cleanup_old_token_grants()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM subscription_token_grants
  WHERE grant_month < (CURRENT_DATE - INTERVAL '12 months');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old token grant records', deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup to run quarterly (if using pg_cron)
-- SELECT cron.schedule(
--   'cleanup-old-token-grants',
--   '0 0 1 */3 *',  -- At 00:00 on day 1 of every 3rd month
--   $$SELECT cleanup_old_token_grants();$$
-- );

-- =====================================================
-- Unscheduling jobs (if needed)
-- =====================================================

-- To remove the scheduled job:
-- SELECT cron.unschedule('grant-monthly-subscription-tokens');

-- To remove the cleanup job:
-- SELECT cron.unschedule('cleanup-old-token-grants');

-- =====================================================
-- AUTOMATION SETUP COMPLETE
-- =====================================================


-- ========================================
-- Migration: 20250125_add_character_id_to_models.sql
-- ========================================
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

-- ========================================
-- Migration: 20250125_add_message_counter.sql
-- ========================================
-- Add message counter to user_tokens table
ALTER TABLE user_tokens 
ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN user_tokens.message_count IS 'Tracks the number of messages sent by the user. 1 token is deducted every 4 messages.';

-- ========================================
-- Migration: 20250125_withdrawal_system.sql
-- ========================================
-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 50.00),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('paypal', 'usdt_trc20')),
    payment_details JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawal_transactions table for history
CREATE TABLE IF NOT EXISTS withdrawal_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    withdrawal_request_id UUID REFERENCES withdrawal_requests(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_details JSONB NOT NULL,
    status TEXT NOT NULL,
    transaction_hash TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_user_id ON withdrawal_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_transactions_created_at ON withdrawal_transactions(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_withdrawal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for withdrawal_requests
DROP TRIGGER IF EXISTS set_withdrawal_updated_at ON withdrawal_requests;
CREATE TRIGGER set_withdrawal_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_withdrawal_updated_at();

-- Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can create their own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can update their pending requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can view their own withdrawal transactions" ON withdrawal_transactions;
DROP POLICY IF EXISTS "Service role can manage withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Service role can manage withdrawal transactions" ON withdrawal_transactions;

-- Create RLS Policies for withdrawal_requests
CREATE POLICY "Users can view their own withdrawal requests"
    ON withdrawal_requests
    FOR SELECT
    TO authenticated
    USING (withdrawal_requests.user_id = auth.uid());

CREATE POLICY "Users can create their own withdrawal requests"
    ON withdrawal_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (withdrawal_requests.user_id = auth.uid());

CREATE POLICY "Users can update their pending requests"
    ON withdrawal_requests
    FOR UPDATE
    TO authenticated
    USING (withdrawal_requests.user_id = auth.uid() AND withdrawal_requests.status = 'pending');

-- Create RLS Policies for withdrawal_transactions
CREATE POLICY "Users can view their own withdrawal transactions"
    ON withdrawal_transactions
    FOR SELECT
    TO authenticated
    USING (withdrawal_transactions.user_id = auth.uid());

-- Service role policies (for server-side operations)
CREATE POLICY "Service role can manage withdrawal requests"
    ON withdrawal_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage withdrawal transactions"
    ON withdrawal_transactions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE withdrawal_requests IS 'Stores withdrawal requests from users';
COMMENT ON TABLE withdrawal_transactions IS 'Stores completed withdrawal transaction history';
COMMENT ON COLUMN withdrawal_requests.payment_method IS 'Payment method: paypal or usdt_trc20';
COMMENT ON COLUMN withdrawal_requests.payment_details IS 'JSON containing payment details (email for PayPal, wallet address for USDT)';
COMMENT ON COLUMN withdrawal_requests.status IS 'Status: pending, approved, rejected, completed';

-- ========================================
-- Migration: 20250126_add_character_id_to_generated_images.sql
-- ========================================

-- ========================================
-- Migration: 20250126_create_gallery_unlocks.sql
-- ========================================
-- Create table to track gallery unlocks
CREATE TABLE IF NOT EXISTS gallery_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, character_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS gallery_unlocks_user_id_idx ON gallery_unlocks (user_id);
CREATE INDEX IF NOT EXISTS gallery_unlocks_character_id_idx ON gallery_unlocks (character_id);

-- Enable Row Level Security
ALTER TABLE gallery_unlocks ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own unlocks
CREATE POLICY "Users can view their own gallery unlocks" 
ON gallery_unlocks FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to insert their own unlocks (via API)
CREATE POLICY "Users can insert their own gallery unlocks" 
ON gallery_unlocks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- Migration: 20250128_add_media_type_to_generated_images.sql
-- ========================================
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

-- ========================================
-- Migration: 20250130_cleanup_duplicate_stripe_sessions.sql
-- ========================================
-- Clean up duplicate stripe_session_id records before adding unique constraint
-- This migration removes duplicate payment transactions, keeping only the most recent one per stripe_session_id

-- Step 1: Identify and delete duplicate records, keeping only the most recent one per stripe_session_id
DELETE FROM payment_transactions
WHERE id NOT IN (
    SELECT DISTINCT ON (stripe_session_id) id
    FROM payment_transactions
    WHERE stripe_session_id IS NOT NULL
    ORDER BY stripe_session_id, created_at DESC
);

-- Step 2: Add unique constraint now that duplicates are cleaned up
ALTER TABLE payment_transactions
ADD CONSTRAINT payment_transactions_stripe_session_id_unique
UNIQUE (stripe_session_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT payment_transactions_stripe_session_id_unique ON payment_transactions
IS 'Ensures only one payment transaction per Stripe session to prevent duplicate processing';

-- Step 3: Verify the constraint was added successfully
DO $$
BEGIN
    RAISE NOTICE 'Unique constraint added successfully to payment_transactions.stripe_session_id';
END $$;

-- ========================================
-- Migration: 20250130_create_shared_chats.sql
-- ========================================
-- Create shared_chats table for chat sharing functionality
CREATE TABLE IF NOT EXISTS shared_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL,
    share_code VARCHAR(50) UNIQUE NOT NULL,
    include_history BOOLEAN DEFAULT true,
    chat_data JSONB,
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shared_chats_user_id ON shared_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_chats_share_code ON shared_chats(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_chats_character_id ON shared_chats(character_id);
CREATE INDEX IF NOT EXISTS idx_shared_chats_created_at ON shared_chats(created_at DESC);

-- Enable Row Level Security
ALTER TABLE shared_chats ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own shared chats
CREATE POLICY "Users can view their own shared chats"
ON shared_chats FOR SELECT
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own shared chats
CREATE POLICY "Users can insert their own shared chats"
ON shared_chats FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own shared chats
CREATE POLICY "Users can update their own shared chats"
ON shared_chats FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own shared chats
CREATE POLICY "Users can delete their own shared chats"
ON shared_chats FOR DELETE
USING (auth.uid() = user_id);

-- Create policy to allow anyone to view active shared chats by share code
CREATE POLICY "Anyone can view active shared chats by code"
ON shared_chats FOR SELECT
USING (is_active = true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_shared_chats_updated_at 
BEFORE UPDATE ON shared_chats
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        new_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM shared_chats WHERE share_code = new_code) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to track share click and return affiliate info
CREATE OR REPLACE FUNCTION track_share_click(p_share_code TEXT)
RETURNS TABLE (
    character_id TEXT,
    user_id UUID,
    affiliate_code TEXT,
    include_history BOOLEAN,
    chat_data JSONB
) AS $$
DECLARE
    v_user_id UUID;
    v_affiliate_code TEXT;
BEGIN
    -- Update click count
    UPDATE shared_chats
    SET click_count = click_count + 1
    WHERE share_code = p_share_code AND is_active = true
    RETURNING shared_chats.user_id INTO v_user_id;
    
    -- Get affiliate code if user is an affiliate
    SELECT a.affiliate_code INTO v_affiliate_code
    FROM affiliates a
    WHERE a.user_id = v_user_id AND a.status = 'approved';
    
    -- Return the shared chat info
    RETURN QUERY
    SELECT 
        sc.character_id,
        sc.user_id,
        v_affiliate_code,
        sc.include_history,
        sc.chat_data
    FROM shared_chats sc
    WHERE sc.share_code = p_share_code AND sc.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Migration: 20250130_fix_ambiguous_referrer_id.sql
-- ========================================
-- Fix ambiguous referrer_id in track_multilevel_commission function

CREATE OR REPLACE FUNCTION track_multilevel_commission(
    p_buyer_id UUID,
    p_payment_amount DECIMAL,
    p_payment_id UUID
)
RETURNS TABLE (
    level INTEGER,
    referrer_id UUID,
    commission_amount DECIMAL
) AS $$
DECLARE
    v_current_user UUID;
    v_referrer UUID;
    v_level INTEGER;
    v_commission_rate DECIMAL;
    v_commission_amount DECIMAL;
BEGIN
    v_current_user := p_buyer_id;
    v_level := 1;
    
    -- Loop through up to 3 levels
    WHILE v_level <= 3 LOOP
        -- Get the referrer for current user (fixed: added table alias to avoid ambiguity)
        SELECT up.referrer_id INTO v_referrer
        FROM user_profiles up
        WHERE up.user_id = v_current_user;
        
        -- Exit if no referrer
        EXIT WHEN v_referrer IS NULL;
        
        -- Determine commission rate based on level
        v_commission_rate := CASE
            WHEN v_level = 1 THEN 0.50  -- 50%
            WHEN v_level = 2 THEN 0.05  -- 5%
            WHEN v_level = 3 THEN 0.05  -- 5%
            ELSE 0
        END;
        
        v_commission_amount := p_payment_amount * v_commission_rate;
        
        -- Update bonus wallet
        INSERT INTO bonus_wallets (user_id, balance, lifetime_earnings)
        VALUES (v_referrer, v_commission_amount, v_commission_amount)
        ON CONFLICT (user_id) DO UPDATE
        SET 
            balance = bonus_wallets.balance + v_commission_amount,
            lifetime_earnings = bonus_wallets.lifetime_earnings + v_commission_amount,
            updated_at = CURRENT_TIMESTAMP;
        
        -- Record transaction
        INSERT INTO bonus_transactions (
            user_id,
            transaction_type,
            amount,
            from_user_id,
            payment_id,
            level,
            description,
            status
        ) VALUES (
            v_referrer,
            'commission_level' || v_level,
            v_commission_amount,
            p_buyer_id,
            p_payment_id,
            v_level,
            'Level ' || v_level || ' commission from referral purchase',
            'completed'
        );
        
        -- Return the commission info
        RETURN QUERY SELECT v_level, v_referrer, v_commission_amount;
        
        -- Move up the referral chain
        v_current_user := v_referrer;
        v_level := v_level + 1;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Migration: 20250130_fix_downlines_function.sql
-- ========================================
-- Fix the get_user_downlines function to work with RLS

-- Drop and recreate with SECURITY DEFINER
DROP FUNCTION IF EXISTS get_user_downlines(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_user_downlines(p_user_id UUID, p_max_level INTEGER DEFAULT 3)
RETURNS TABLE (
    downline_id UUID,
    downline_email CHARACTER VARYING(255),
    level INTEGER,
    total_earnings DECIMAL,
    joined_date TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_tree AS (
        -- Base case: direct referrals (level 1)
        SELECT 
            u.id as downline_id,
            u.email as downline_email,
            1 as level,
            u.created_at as joined_date
        FROM auth.users u
        INNER JOIN user_profiles up ON u.id = up.user_id
        WHERE up.referrer_id = p_user_id
        
        UNION ALL
        
        -- Recursive case: get referrals of referrals
        SELECT 
            u.id,
            u.email,
            dt.level + 1,
            u.created_at
        FROM auth.users u
        INNER JOIN user_profiles up ON u.id = up.user_id
        INNER JOIN downline_tree dt ON up.referrer_id = dt.downline_id
        WHERE dt.level < p_max_level
    )
    SELECT 
        dt.downline_id,
        dt.downline_email,
        dt.level,
        COALESCE(SUM(bt.amount), 0) as total_earnings,
        dt.joined_date
    FROM downline_tree dt
    LEFT JOIN bonus_transactions bt ON bt.from_user_id = dt.downline_id
    GROUP BY dt.downline_id, dt.downline_email, dt.level, dt.joined_date
    ORDER BY dt.level, dt.joined_date DESC;
END;
$$;

-- ========================================
-- Migration: 20250130_fix_referral_lookup.sql
-- ========================================
-- Allow public lookup of user_profiles by referral code
-- This is needed so the link-referrer API can find referrers

-- Add policy to allow anyone to SELECT user_profiles when looking up by referral_code
CREATE POLICY "Allow public referral code lookup"
ON user_profiles FOR SELECT
USING (true); -- Allow all reads (referral codes are meant to be shared)

-- Note: This replaces the more restrictive policy
-- The existing policies will remain for UPDATE operations

-- ========================================
-- Migration: 20250130_fix_user_profile_trigger.sql
-- ========================================
-- Fix the user profile creation trigger to bypass RLS

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

-- Recreate the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, referral_code)
    VALUES (NEW.id, generate_referral_code())
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Also ensure the user_profiles table allows inserts from the trigger
-- Temporarily disable RLS to allow the trigger to work
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Add a policy that allows inserts during user creation
CREATE POLICY "Allow profile creation on signup"
ON user_profiles FOR INSERT
WITH CHECK (true); -- Allow all inserts (the trigger will handle this)

-- Keep existing policies for SELECT and UPDATE
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
ON user_profiles FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- ========================================
-- Migration: 20250130_multi_level_affiliate_system.sql
-- ========================================
-- Multi-Level Affiliate System with USDT Withdrawals

-- Create user profiles table for referral tracking (since we can't modify auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referrer_id ON user_profiles(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON user_profiles FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create bonus wallet table for tracking earnings
CREATE TABLE IF NOT EXISTS bonus_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    lifetime_earnings DECIMAL(12, 2) DEFAULT 0.00,
    withdrawn_amount DECIMAL(12, 2) DEFAULT 0.00,
    usdt_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create referral tree table for tracking multi-level structure
CREATE TABLE IF NOT EXISTS referral_tree (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, referrer_id)
);

-- Create bonus transactions table for detailed tracking
CREATE TABLE IF NOT EXISTS bonus_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'commission_level1', 'commission_level2', 'commission_level3', 'withdrawal', 'adjustment'
    amount DECIMAL(12, 2) NOT NULL,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    payment_id UUID, -- Reference to the payment that triggered this
    level INTEGER, -- Which referral level (1, 2, or 3)
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create USDT withdrawal requests table
CREATE TABLE IF NOT EXISTS usdt_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    usdt_address TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
    tx_hash TEXT, -- Transaction hash after processing
    admin_note TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bonus_wallets_user_id ON bonus_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_tree_user_id ON referral_tree(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_tree_referrer_id ON referral_tree(referrer_id);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_user_id ON bonus_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_from_user ON bonus_transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_usdt_withdrawals_user_id ON usdt_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_usdt_withdrawals_status ON usdt_withdrawals(status);

-- Enable RLS
ALTER TABLE bonus_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_tree ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usdt_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bonus_wallets
CREATE POLICY "Users can view their own bonus wallet"
ON bonus_wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet address"
ON bonus_wallets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bonus wallets"
ON bonus_wallets FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- RLS Policies for referral_tree
CREATE POLICY "Users can view their referral tree"
ON referral_tree FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referral trees"
ON referral_tree FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- RLS Policies for bonus_transactions
CREATE POLICY "Users can view their own transactions"
ON bonus_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON bonus_transactions FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- RLS Policies for usdt_withdrawals
CREATE POLICY "Users can view their own withdrawals"
ON usdt_withdrawals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawals"
ON usdt_withdrawals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all withdrawals"
ON usdt_withdrawals FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create triggers
CREATE TRIGGER update_bonus_wallets_updated_at
BEFORE UPDATE ON bonus_wallets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
        
        -- Check if code already exists
        SELECT EXISTS(
            SELECT 1 FROM user_profiles WHERE referral_code = new_code
        ) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, referral_code)
    VALUES (NEW.id, generate_referral_code())
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create profile for new users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_profile();

-- Function to track multi-level commission
CREATE OR REPLACE FUNCTION track_multilevel_commission(
    p_buyer_id UUID,
    p_payment_amount DECIMAL,
    p_payment_id UUID
)
RETURNS TABLE (
    level INTEGER,
    referrer_id UUID,
    commission_amount DECIMAL
) AS $$
DECLARE
    v_current_user UUID;
    v_referrer UUID;
    v_level INTEGER;
    v_commission_rate DECIMAL;
    v_commission_amount DECIMAL;
BEGIN
    v_current_user := p_buyer_id;
    v_level := 1;
    
    -- Loop through up to 3 levels
    WHILE v_level <= 3 LOOP
        -- Get the referrer for current user
        SELECT referrer_id INTO v_referrer
        FROM user_profiles
        WHERE user_id = v_current_user;
        
        -- Exit if no referrer
        EXIT WHEN v_referrer IS NULL;
        
        -- Determine commission rate based on level
        v_commission_rate := CASE
            WHEN v_level = 1 THEN 0.50  -- 50%
            WHEN v_level = 2 THEN 0.05  -- 5%
            WHEN v_level = 3 THEN 0.05  -- 5%
            ELSE 0
        END;
        
        v_commission_amount := p_payment_amount * v_commission_rate;
        
        -- Update bonus wallet
        INSERT INTO bonus_wallets (user_id, balance, lifetime_earnings)
        VALUES (v_referrer, v_commission_amount, v_commission_amount)
        ON CONFLICT (user_id) DO UPDATE
        SET 
            balance = bonus_wallets.balance + v_commission_amount,
            lifetime_earnings = bonus_wallets.lifetime_earnings + v_commission_amount,
            updated_at = CURRENT_TIMESTAMP;
        
        -- Record transaction
        INSERT INTO bonus_transactions (
            user_id,
            transaction_type,
            amount,
            from_user_id,
            payment_id,
            level,
            description,
            status
        ) VALUES (
            v_referrer,
            'commission_level' || v_level,
            v_commission_amount,
            p_buyer_id,
            p_payment_id,
            v_level,
            'Level ' || v_level || ' commission from referral purchase',
            'completed'
        );
        
        -- Return the commission info
        RETURN QUERY SELECT v_level, v_referrer, v_commission_amount;
        
        -- Move up the referral chain
        v_current_user := v_referrer;
        v_level := v_level + 1;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's downlines
CREATE OR REPLACE FUNCTION get_user_downlines(p_user_id UUID, p_max_level INTEGER DEFAULT 3)
RETURNS TABLE (
    downline_id UUID,
    downline_email TEXT,
    level INTEGER,
    total_earnings DECIMAL,
    joined_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_tree AS (
        -- Base case: direct referrals (level 1)
        SELECT 
            u.id as downline_id,
            u.email as downline_email,
            1 as level,
            u.created_at as joined_date
        FROM auth.users u
        INNER JOIN user_profiles up ON u.id = up.user_id
        WHERE up.referrer_id = p_user_id
        
        UNION ALL
        
        -- Recursive case: get referrals of referrals
        SELECT 
            u.id,
            u.email,
            dt.level + 1,
            u.created_at
        FROM auth.users u
        INNER JOIN user_profiles up ON u.id = up.user_id
        INNER JOIN downline_tree dt ON up.referrer_id = dt.downline_id
        WHERE dt.level < p_max_level
    )
    SELECT 
        dt.downline_id,
        dt.downline_email,
        dt.level,
        COALESCE(SUM(bt.amount), 0) as total_earnings,
        dt.joined_date
    FROM downline_tree dt
    LEFT JOIN bonus_transactions bt ON bt.from_user_id = dt.downline_id
    GROUP BY dt.downline_id, dt.downline_email, dt.level, dt.joined_date
    ORDER BY dt.level, dt.joined_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Migration: 20250131_create_admin_character_content.sql
-- ========================================
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

-- ========================================
-- Migration: 20250131_fix_earnings_decimal_precision.sql
-- ========================================
-- Fix decimal precision for earnings tables to support micro-earnings ($0.0001 per token)

-- Update model_creator_earnings table to use 4 decimal places
ALTER TABLE model_creator_earnings
ALTER COLUMN total_earnings TYPE DECIMAL(10,4);

-- Update earnings_transactions table to use 4 decimal places
ALTER TABLE earnings_transactions
ALTER COLUMN amount TYPE DECIMAL(10,4);

-- Update model_analytics table to use 4 decimal places
ALTER TABLE model_analytics
ALTER COLUMN earnings_generated TYPE DECIMAL(10,4),
ALTER COLUMN avg_usage_per_user TYPE DECIMAL(10,4);

-- ========================================
-- Migration: 20250132_create_messages_table.sql
-- ========================================
-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_image BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    is_video BOOLEAN DEFAULT FALSE,
    video_url TEXT,
    is_error BOOLEAN DEFAULT FALSE,
    error_prompt TEXT
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_user_character ON messages(user_id, character_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for AI (service role) to insert messages - typically handled by bypassing RLS on server side, 
-- but if we use the client SDK with user token, we need this.
-- However, for now, we'll assume server actions use service role or user context.

-- Function to update character's message count and last interaction
CREATE OR REPLACE FUNCTION update_character_stats_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp on the character to track recent activity
    -- This might need a separate table for user-character interactions if we want per-user recent chats
    -- For now, let's just ensure we can query recent messages efficiently.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_character_stats
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_character_stats_on_message();

-- ========================================
-- Migration: 20250810222200_create_decrement_user_tokens_function.sql
-- ========================================
CREATE OR REPLACE FUNCTION decrement_user_tokens(
  p_user_id UUID,
  p_tokens_to_decrement INT
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET tokens = tokens - p_tokens_to_decrement
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;
-- ========================================
-- Migration: 20250811142000_create_settings_table.sql
-- ========================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow admin write access" ON settings FOR ALL USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.users.email IN (
      SELECT email FROM admin_users
    )
  ));
-- ========================================
-- Migration: 20250811171500_update_users_rls.sql
-- ========================================
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for profile_pic_url"
ON auth.users FOR SELECT
USING ( true );
-- ========================================
-- Migration: 20250811194800_create_execute_sql_function.sql
-- ========================================
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN json_build_object('status', 'success');
END;
$$;
-- ========================================
-- Migration: 20250812135400_create_documents_table.sql
-- ========================================
CREATE TABLE documents (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO documents (name, content) VALUES
('privacy_policy', 'Your privacy policy content goes here.'),
('terms_of_service', 'Your terms of service content goes here.');

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at_trigger
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
-- ========================================
-- Migration: 20250812163500_create_revenue_transactions_table.sql
-- ========================================
CREATE TABLE revenue_transactions (
    id SERIAL PRIMARY KEY,
    amount INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- ========================================
-- Migration: 20250812172200_alter_revenue_transactions_amount_type.sql
-- ========================================
ALTER TABLE revenue_transactions
ALTER COLUMN amount TYPE NUMERIC(10, 2);
-- ========================================
-- Migration: 20250812174500_create_token_packages_table.sql
-- ========================================
CREATE TABLE token_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ========================================
-- Migration: 20250812174600_create_premium_page_content_table.sql
-- ========================================
CREATE TABLE premium_page_content (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    section TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ========================================
-- Migration: 20250812174700_seed_premium_page_content.sql
-- ========================================
INSERT INTO premium_page_content (section, content) VALUES
('main_title', 'Buy Tokens'),
('main_subtitle', '100% anonymous. You can cancel anytime.'),
('token_system_title', 'Token System'),
('pay_as_you_go_title', 'Pay As You Go'),
('purchase_intro', 'Purchase tokens to generate images. <span class="text-[#FF8C00] font-semibold">5 tokens per image.</span>'),
('how_tokens_work_title', 'How Tokens Work'),
('how_tokens_work_item_1', 'Each image generation costs 5 tokens'),
('how_tokens_work_item_2', 'Tokens never expire'),
('how_tokens_work_item_3', 'Buy in bulk for better value'),
('select_package_title', 'Select Token Package'),
('value_comparison_title', 'Value Comparison'),
('why_buy_tokens_title', 'Why Buy Tokens?'),
('why_buy_tokens_item_1', 'No recurring payments'),
('why_buy_tokens_item_2', 'Pay only for what you need'),
('why_buy_tokens_item_3', 'Higher quality image generation'),
('security_badge_1', 'Antivirus Secured'),
('security_badge_2', 'Privacy in bank statement');
-- ========================================
-- Migration: 20250812174800_seed_token_packages.sql
-- ========================================
INSERT INTO token_packages (name, tokens, price) VALUES
('Basic', 200, 9.99),
('Standard', 550, 34.99),
('Super Value', 5800, 49.99),
('Premium', 1550, 99.99),
('Professional', 2900, 199.99),
('Enterprise', 5000, 299.99);
-- ========================================
-- Migration: 20250812174900_add_token_packages_rls.sql
-- ========================================
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

-- ========================================
-- Migration: 20250812175000_add_monetization_settings.sql
-- ========================================
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
-- ========================================
-- Migration: 20250917101100_fix_is_admin_function.sql
-- ========================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ========================================
-- Migration: 20251122_add_legal_documents.sql
-- ========================================
INSERT INTO documents (name, content) VALUES
('cookies_policy', 'Your Cookies Notice content goes here.'),
('underage_policy', 'Your Underage Policy content goes here.'),
('content_removal_policy', 'Your Content Removal Policy content goes here.'),
('blocked_content_policy', 'Your Blocked Content Policy content goes here.'),
('dmca_policy', 'Your DMCA Policy content goes here.'),
('complaint_policy', 'Your Complaint Policy content goes here.'),
('2257_exemption', 'Your 18 U.S.C. 2257 Exemption content goes here.'),
('community_guidelines', 'Your Community Guidelines content goes here.'),
('affiliate_terms', 'Your Affiliate Terms & Conditions content goes here.')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- Migration: 20251123_fix_profiles_id_type.sql
-- ========================================
-- Migration to fix the profiles.id column type from integer to UUID
-- This script is designed to be run if your profiles.id is an integer, causing errors with RLS policies.

-- Step 1: Lock the table to prevent writes during migration
LOCK TABLE public.profiles IN EXCLUSIVE MODE;

-- Step 2: Create a backup of the current profiles table
CREATE TABLE profiles_backup AS TABLE public.profiles;

-- Step 3: Add a temporary 'user_id_uuid' column to the backup to store the converted UUID
ALTER TABLE profiles_backup ADD COLUMN user_id_uuid UUID;

-- Step 4: Populate the new UUID column by joining with auth.users
-- This assumes that profiles.id was referencing auth.users.id, but as an integer which is incorrect.
-- This query might need adjustment if the relationship is different.
UPDATE profiles_backup pb
SET user_id_uuid = u.id
FROM auth.users u
WHERE u.id::text = pb.id::text; -- This cast is speculative, might fail if IDs dont match format.
-- A safer alternative if the above fails is to join on email if profiles table has it.
-- e.g., JOIN auth.users u ON u.email = pb.email;

-- Step 5: Drop the old profiles table (and dependent objects like policies)
DROP TABLE public.profiles CASCADE;

-- Step 6: Recreate the profiles table with the correct schema
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT, -- NOTE: UNIQUE constraint removed temporarily to prevent migration failure. Add it back later.
  avatar_url TEXT,
  website TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT FALSE,
  tokens INTEGER DEFAULT 10,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Step 7: Restore data from the backup into the new table
-- This version joins with auth.users to get the username from user metadata,
-- which is a common pattern if the profiles table does not have a username column.
INSERT INTO public.profiles (id, username, avatar_url, website, updated_at, is_admin, tokens)
SELECT 
  pb.user_id_uuid,
  COALESCE(u.raw_user_meta_data->>'username', u.raw_user_meta_data->>'user_name', 'user_' || substr(pb.user_id_uuid::text, 1, 8)),
  pb.avatar_url,
  pb.website,
  pb.updated_at,
  pb.is_admin,
  pb.tokens
FROM 
  profiles_backup pb
JOIN 
  auth.users u ON pb.user_id_uuid = u.id
WHERE 
  pb.user_id_uuid IS NOT NULL; -- Ensure we only insert rows that were successfully mapped

-- Step 8: Re-apply Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Step 9: (Optional but recommended) Clean up the backup table after verifying data
-- DROP TABLE profiles_backup;

-- Final check: The RLS policies on other tables (like admin_settings) should now work correctly.

-- ========================================
-- Migration: 20251202_per_plan_bonus_tokens.sql
-- ========================================
-- Add monthly_bonus_tokens to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS monthly_bonus_tokens INTEGER DEFAULT 100;

-- Update grant_monthly_tokens_to_subscribers function to use per-plan tokens
CREATE OR REPLACE FUNCTION grant_monthly_tokens_to_subscribers()
RETURNS TABLE (
  user_id UUID,
  tokens_granted INTEGER,
  subscription_status TEXT,
  message TEXT
) AS $$
DECLARE
  v_current_month DATE;
  v_user_record RECORD;
  v_granted_count INTEGER := 0;
BEGIN
  -- Get the first day of the current month
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  RAISE NOTICE 'Starting monthly token grant process for month: %', v_current_month;
  
  -- Find all active subscribers who haven't received tokens this month
  FOR v_user_record IN
    WITH active_subscriptions AS (
      -- Get active subscriptions from payment_transactions
      SELECT DISTINCT ON (pt.user_id)
        pt.user_id,
        pt.plan_name,
        pt.plan_id,
        pt.plan_duration,
        pt.created_at as subscription_start,
        (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at,
        COALESCE(sp.monthly_bonus_tokens, 100) as plan_bonus_tokens
      FROM payment_transactions pt
      LEFT JOIN subscription_plans sp ON pt.plan_id = sp.id
      WHERE pt.status = 'completed'
        AND pt.plan_id IS NOT NULL
        AND (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW()
      ORDER BY pt.user_id, pt.created_at DESC
    )
    SELECT 
      s.user_id,
      s.plan_name,
      s.plan_id,
      s.expires_at,
      s.plan_bonus_tokens
    FROM active_subscriptions s
    WHERE NOT EXISTS (
      -- Check if tokens were already granted this month
      SELECT 1 
      FROM subscription_token_grants stg
      WHERE stg.user_id = s.user_id 
        AND stg.grant_month = v_current_month
    )
  LOOP
    BEGIN
      -- Insert grant record
      INSERT INTO subscription_token_grants (
        user_id,
        grant_month,
        tokens_granted,
        subscription_expires_at,
        plan_name,
        plan_id
      ) VALUES (
        v_user_record.user_id,
        v_current_month,
        v_user_record.plan_bonus_tokens,
        v_user_record.expires_at,
        v_user_record.plan_name,
        v_user_record.plan_id
      );
      
      -- Update user token balance
      INSERT INTO user_tokens (user_id, balance, created_at, updated_at)
      VALUES (
        v_user_record.user_id,
        v_user_record.plan_bonus_tokens,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_tokens.balance + v_user_record.plan_bonus_tokens,
        updated_at = NOW();
      
      -- Record transaction
      INSERT INTO token_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        created_at
      ) VALUES (
        v_user_record.user_id,
        v_user_record.plan_bonus_tokens,
        'subscription_grant',
        'Monthly subscription tokens for ' || TO_CHAR(v_current_month, 'Month YYYY'),
        jsonb_build_object(
          'grant_month', v_current_month,
          'plan_name', v_user_record.plan_name,
          'expires_at', v_user_record.expires_at,
          'bonus_amount', v_user_record.plan_bonus_tokens
        ),
        NOW()
      );
      
      v_granted_count := v_granted_count + 1;
      
      -- Return result for this user
      user_id := v_user_record.user_id;
      tokens_granted := v_user_record.plan_bonus_tokens;
      subscription_status := 'active';
      message := 'Successfully granted ' || v_user_record.plan_bonus_tokens || ' tokens';
      RETURN NEXT;
      
      RAISE NOTICE 'Granted % tokens to user %', v_user_record.plan_bonus_tokens, v_user_record.user_id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other users
      RAISE WARNING 'Failed to grant tokens to user %: %', v_user_record.user_id, SQLERRM;
      
      user_id := v_user_record.user_id;
      tokens_granted := 0;
      subscription_status := 'error';
      message := 'Error: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
  
  RAISE NOTICE 'Monthly token grant completed. Total users granted: %', v_granted_count;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update grant_tokens_to_subscriber for single user grants
CREATE OR REPLACE FUNCTION grant_tokens_to_subscriber(p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  tokens_granted INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_month DATE;
  v_subscription RECORD;
BEGIN
  -- Get the first day of the current month
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Check if user has an active subscription
  SELECT 
    pt.user_id,
    pt.plan_name,
    pt.plan_id,
    pt.plan_duration,
    pt.created_at as subscription_start,
    (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at,
    COALESCE(sp.monthly_bonus_tokens, 100) as plan_bonus_tokens
  INTO v_subscription
  FROM payment_transactions pt
  LEFT JOIN subscription_plans sp ON pt.plan_id = sp.id
  WHERE pt.user_id = p_user_id
    AND pt.status = 'completed'
    AND pt.plan_id IS NOT NULL
    AND (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW()
  ORDER BY pt.created_at DESC
  LIMIT 1;
  
  IF v_subscription.user_id IS NULL THEN
    success := false;
    tokens_granted := 0;
    message := 'No active subscription found for this user';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if tokens were already granted this month
  IF EXISTS (
    SELECT 1 
    FROM subscription_token_grants 
    WHERE user_id = p_user_id 
      AND grant_month = v_current_month
  ) THEN
    success := false;
    tokens_granted := 0;
    message := 'Tokens already granted for this month';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Grant tokens
  BEGIN
    -- Insert grant record
    INSERT INTO subscription_token_grants (
      user_id,
      grant_month,
      tokens_granted,
      subscription_expires_at,
      plan_name,
      plan_id
    ) VALUES (
      p_user_id,
      v_current_month,
      v_subscription.plan_bonus_tokens,
      v_subscription.expires_at,
      v_subscription.plan_name,
      v_subscription.plan_id
    );
    
    -- Update user token balance
    INSERT INTO user_tokens (user_id, balance, created_at, updated_at)
    VALUES (p_user_id, v_subscription.plan_bonus_tokens, NOW(), NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = user_tokens.balance + v_subscription.plan_bonus_tokens,
      updated_at = NOW();
    
    -- Record transaction
    INSERT INTO token_transactions (
      user_id,
      amount,
      type,
      description,
      metadata,
      created_at
    ) VALUES (
      p_user_id,
      v_subscription.plan_bonus_tokens,
      'subscription_grant',
      'Monthly subscription tokens for ' || TO_CHAR(v_current_month, 'Month YYYY'),
      jsonb_build_object(
        'grant_month', v_current_month,
        'plan_name', v_subscription.plan_name,
        'expires_at', v_subscription.expires_at,
        'bonus_amount', v_subscription.plan_bonus_tokens
      ),
      NOW()
    );
    
    success := true;
    tokens_granted := v_subscription.plan_bonus_tokens;
    message := 'Successfully granted ' || v_subscription.plan_bonus_tokens || ' tokens';
    RETURN NEXT;
    
  EXCEPTION WHEN OTHERS THEN
    success := false;
    tokens_granted := 0;
    message := 'Error: ' || SQLERRM;
    RETURN NEXT;
  END;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

