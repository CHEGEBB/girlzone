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

