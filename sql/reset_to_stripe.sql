-- Quick Fix: Reset payment gateway to Stripe
-- Run this in your Supabase SQL Editor to stop the errors immediately

-- Set payment gateway back to Stripe (default)
INSERT INTO admin_settings (key, value, updated_at)
VALUES ('payment_gateway', 'stripe', NOW())
ON CONFLICT (key) 
DO UPDATE SET value = 'stripe', updated_at = NOW();

-- Verify the change
SELECT key, value FROM admin_settings WHERE key = 'payment_gateway';

-- Expected result: payment_gateway | stripe
