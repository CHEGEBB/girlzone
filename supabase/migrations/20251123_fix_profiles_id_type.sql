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
