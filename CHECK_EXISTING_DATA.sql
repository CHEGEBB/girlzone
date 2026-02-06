-- =====================================================
-- DIAGNOSTIC: Check Existing Token Transaction Types
-- =====================================================
-- Run this BEFORE the migration to see what data you have
-- =====================================================

-- 1. Check all unique transaction types currently in your database
SELECT 
  type,
  COUNT(*) as count,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence
FROM token_transactions
GROUP BY type
ORDER BY count DESC;

-- Expected types: 'purchase', 'usage', 'refund', 'bonus'
-- If you see other types, that's causing the error


-- 2. Check the current constraint definition
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'token_transactions_type_check';


-- 3. Sample of each transaction type
SELECT DISTINCT ON (type)
  type,
  amount,
  description,
  created_at
FROM token_transactions
ORDER BY type, created_at DESC;


-- =====================================================
-- SOLUTION OPTIONS
-- =====================================================

-- Option A: Use the FIXED migration file (RECOMMENDED)
-- File: 20250122_subscription_monthly_tokens_FIXED.sql
-- This version automatically detects and includes all existing types


-- Option B: Manually update existing non-standard types (if needed)
-- If you have types that shouldn't exist, you can update them:

-- Example: Update 'manual_stripe_verification' to 'purchase'
-- UPDATE token_transactions 
-- SET type = 'purchase' 
-- WHERE type = 'manual_stripe_verification';

-- Then run the original migration


-- Option C: Drop constraint temporarily, run migration, re-add
-- (Advanced - not recommended for production)

-- =====================================================
-- After reviewing your data, use the FIXED migration
-- =====================================================

