-- =====================================================
-- TEST MIGRATION SUCCESS
-- =====================================================
-- Run these queries AFTER running the main migration
-- to verify everything was created correctly
-- =====================================================

-- Test 1: Check if subscription_token_grants table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'subscription_token_grants'
) as table_exists;

-- Expected: table_exists = true


-- Test 2: Check if grant_monthly_tokens_to_subscribers function exists
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'grant_monthly_tokens_to_subscribers'
) as function_exists;

-- Expected: function_exists = true


-- Test 3: Check if grant_tokens_to_subscriber function exists
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'grant_tokens_to_subscriber'
) as function_exists;

-- Expected: function_exists = true


-- Test 4: Check if check_subscription_token_status function exists
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'check_subscription_token_status'
) as function_exists;

-- Expected: function_exists = true


-- Test 5: Check token_transactions constraint (should include 'subscription_grant')
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'token_transactions_type_check';

-- Expected: Should show subscription_grant in the check constraint


-- =====================================================
-- If all tests pass, you're ready to grant tokens!
-- =====================================================

-- Now you can run:
-- SELECT * FROM grant_monthly_tokens_to_subscribers();

