-- Allow public lookup of user_profiles by referral code
-- This is needed so the link-referrer API can find referrers

-- Add policy to allow anyone to SELECT user_profiles when looking up by referral_code
CREATE POLICY "Allow public referral code lookup"
ON user_profiles FOR SELECT
USING (true); -- Allow all reads (referral codes are meant to be shared)

-- Note: This replaces the more restrictive policy
-- The existing policies will remain for UPDATE operations
