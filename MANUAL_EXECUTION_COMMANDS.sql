-- =====================================================
-- QUICK EXECUTION COMMANDS
-- =====================================================
-- Copy and paste these commands directly into your
-- Supabase SQL Editor for manual execution
-- =====================================================

-- =====================================================
-- 1. GRANT TOKENS TO ALL ACTIVE SUBSCRIBERS
-- =====================================================
-- Run this at the beginning of each month
-- This will grant 100 tokens to all users with active subscriptions
-- who haven't received tokens yet this month

SELECT * FROM grant_monthly_tokens_to_subscribers();

-- Expected output: List of users with tokens_granted = 100


-- =====================================================
-- 2. GRANT TOKENS TO A SPECIFIC USER
-- =====================================================
-- Replace 'USER_UUID_HERE' with actual user UUID

SELECT * FROM grant_tokens_to_subscriber('USER_UUID_HERE');

-- Example:
-- SELECT * FROM grant_tokens_to_subscriber('a1b2c3d4-e5f6-7890-abcd-ef1234567890');


-- =====================================================
-- 3. CHECK USER'S SUBSCRIPTION STATUS
-- =====================================================
-- Replace 'USER_UUID_HERE' with actual user UUID

SELECT * FROM check_subscription_token_status('USER_UUID_HERE');


-- =====================================================
-- 4. VIEW ALL ACTIVE SUBSCRIBERS
-- =====================================================
-- See all users who currently have active subscriptions

SELECT 
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
ORDER BY pt.created_at DESC;


-- =====================================================
-- 5. VIEW USERS WHO NEED TOKENS THIS MONTH
-- =====================================================
-- Shows active subscribers who haven't received tokens yet

SELECT * FROM pending_token_grants;


-- =====================================================
-- 6. VIEW TOKEN GRANTS FOR CURRENT MONTH
-- =====================================================
-- Shows all token grants that have been processed this month

SELECT 
  stg.user_id,
  au.email,
  stg.tokens_granted,
  stg.plan_name,
  stg.subscription_expires_at,
  stg.created_at as granted_at
FROM subscription_token_grants stg
JOIN auth.users au ON stg.user_id = au.id
WHERE stg.grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
ORDER BY stg.created_at DESC;


-- =====================================================
-- 7. VIEW ALL TOKEN GRANT HISTORY
-- =====================================================
-- Shows complete history of all token grants

SELECT 
  TO_CHAR(stg.grant_month, 'Mon YYYY') as month,
  au.email,
  stg.tokens_granted,
  stg.plan_name,
  stg.created_at as granted_at
FROM subscription_token_grants stg
JOIN auth.users au ON stg.user_id = au.id
ORDER BY stg.grant_month DESC, stg.created_at DESC
LIMIT 100;


-- =====================================================
-- 8. STATISTICS - MONTHLY SUMMARY
-- =====================================================
-- Summary of tokens granted by month

SELECT 
  TO_CHAR(grant_month, 'Month YYYY') as month,
  COUNT(*) as users_granted,
  SUM(tokens_granted) as total_tokens,
  COUNT(DISTINCT plan_name) as different_plans
FROM subscription_token_grants
GROUP BY grant_month
ORDER BY grant_month DESC;


-- =====================================================
-- 9. VERIFY A USER'S TOKEN BALANCE
-- =====================================================
-- Check current token balance for a specific user
-- Replace 'USER_UUID_HERE' with actual user UUID

SELECT 
  ut.user_id,
  au.email,
  ut.balance as current_tokens,
  ut.updated_at as last_updated
FROM user_tokens ut
JOIN auth.users au ON ut.user_id = au.id
WHERE ut.user_id = 'USER_UUID_HERE';


-- =====================================================
-- 10. VIEW USER'S TOKEN TRANSACTION HISTORY
-- =====================================================
-- Shows all token transactions for a user
-- Replace 'USER_UUID_HERE' with actual user UUID

SELECT 
  type,
  amount,
  description,
  created_at,
  metadata
FROM token_transactions
WHERE user_id = 'USER_UUID_HERE'
ORDER BY created_at DESC
LIMIT 50;


-- =====================================================
-- 11. COUNT SUBSCRIBERS BY PLAN
-- =====================================================
-- Shows how many active subscribers per plan

SELECT 
  pt.plan_name,
  COUNT(DISTINCT pt.user_id) as active_subscribers,
  SUM(CASE 
    WHEN EXISTS (
      SELECT 1 FROM subscription_token_grants stg 
      WHERE stg.user_id = pt.user_id 
        AND stg.grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
    ) THEN 1 ELSE 0 
  END) as received_tokens_this_month
FROM payment_transactions pt
WHERE pt.status = 'completed'
  AND pt.plan_id IS NOT NULL
  AND (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW()
GROUP BY pt.plan_name
ORDER BY active_subscribers DESC;


-- =====================================================
-- 12. FIND SPECIFIC USER BY EMAIL
-- =====================================================
-- Get user_id from email address
-- Replace 'user@example.com' with actual email

SELECT id, email, created_at
FROM auth.users
WHERE email = 'user@example.com';


-- =====================================================
-- TROUBLESHOOTING COMMANDS
-- =====================================================

-- If a user's subscription is not being detected:
-- Check their payment history

SELECT 
  pt.id,
  pt.user_id,
  pt.status,
  pt.plan_name,
  pt.plan_id,
  pt.plan_duration,
  pt.created_at,
  (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as calculated_expiry,
  CASE 
    WHEN (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW() 
    THEN 'ACTIVE' 
    ELSE 'EXPIRED' 
  END as status_check
FROM payment_transactions pt
WHERE pt.user_id = 'USER_UUID_HERE'
  AND pt.plan_id IS NOT NULL
ORDER BY pt.created_at DESC;


-- If you need to manually delete a grant (BE CAREFUL!):
-- Only use this for testing or fixing errors

-- DELETE FROM subscription_token_grants 
-- WHERE user_id = 'USER_UUID_HERE' 
--   AND grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE;


-- If you need to check pg_cron jobs (if using automation):

-- SELECT * FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;


-- =====================================================
-- CLEANUP (OPTIONAL)
-- =====================================================
-- Remove old grant records (older than 12 months)
-- Only run if database is getting large

-- SELECT cleanup_old_token_grants();


-- =====================================================
-- END OF COMMANDS
-- =====================================================
-- For detailed documentation, see: SUBSCRIPTION_TOKENS_SETUP.md
-- =====================================================
