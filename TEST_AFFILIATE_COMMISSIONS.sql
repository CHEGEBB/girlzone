-- ============================================
-- AFFILIATE COMMISSION TESTING GUIDE
-- ============================================
-- Use these queries to test and verify the affiliate commission system is working

-- ============================================
-- 1. CHECK USER REFERRAL SETUP
-- ============================================
-- Replace 'buyer@example.com' with the actual buyer's email
SELECT 
    up.user_id,
    u.email as user_email,
    up.referrer_id,
    ref.email as referrer_email,
    up.referral_code,
    up.created_at as user_joined_at
FROM user_profiles up
LEFT JOIN auth.users u ON up.user_id = u.id
LEFT JOIN auth.users ref ON up.referrer_id = ref.id
WHERE u.email = 'buyer@example.com';

-- Expected Result: Should show who referred this user


-- ============================================
-- 2. VIEW COMPLETE REFERRAL CHAIN (3 LEVELS)
-- ============================================
-- Replace with buyer's user_id from query above
WITH RECURSIVE referral_chain AS (
    -- Start with the buyer
    SELECT 
        u.id as user_id,
        u.email,
        up.referrer_id,
        1 as level,
        ARRAY[u.id] as path
    FROM auth.users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = '<BUYER_USER_ID>'
    
    UNION ALL
    
    -- Follow the referral chain up
    SELECT 
        u.id,
        u.email,
        up.referrer_id,
        rc.level + 1,
        rc.path || u.id
    FROM referral_chain rc
    JOIN auth.users u ON rc.referrer_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE rc.level < 4
)
SELECT 
    level,
    user_id,
    email,
    referrer_id,
    CASE 
        WHEN level = 1 THEN 'Buyer'
        WHEN level = 2 THEN 'Level 1 (Gets 50%)'
        WHEN level = 3 THEN 'Level 2 (Gets 5%)'
        WHEN level = 4 THEN 'Level 3 (Gets 5%)'
    END as role
FROM referral_chain
ORDER BY level;


-- ============================================
-- 3. CHECK BONUS WALLETS (BEFORE PURCHASE)
-- ============================================
-- Check current balances of potential earners
SELECT 
    bw.user_id,
    u.email,
    bw.balance as current_balance,
    bw.lifetime_earnings,
    bw.withdrawn_amount,
    bw.updated_at
FROM bonus_wallets bw
JOIN auth.users u ON bw.user_id = u.id
WHERE u.email IN ('referrer1@example.com', 'referrer2@example.com', 'referrer3@example.com')
ORDER BY u.email;

-- Note: If wallets don't exist yet, they'll be created on first commission


-- ============================================
-- 4. SIMULATE COMMISSION CALCULATION
-- ============================================
-- Test the commission function manually (won't actually create records with SELECT)
-- Replace with actual buyer_id and test payment amount
SELECT * FROM track_multilevel_commission(
    '<BUYER_USER_ID>'::uuid,
    100.00,  -- $100 test payment
    'test-payment-id-123'::uuid
);

-- Expected Result:
-- Level 1: $50 (50%)
-- Level 2: $5 (5%)
-- Level 3: $5 (5%)


-- ============================================
-- 5. CHECK BONUS TRANSACTIONS (AFTER PURCHASE)
-- ============================================
-- View all commission transactions for a specific payment
-- Replace with actual Stripe session ID
SELECT 
    bt.id,
    bt.transaction_type,
    bt.level,
    bt.amount,
    u.email as earner,
    buyer.email as buyer,
    bt.payment_id,
    bt.status,
    bt.description,
    bt.created_at
FROM bonus_transactions bt
LEFT JOIN auth.users u ON bt.user_id = u.id
LEFT JOIN auth.users buyer ON bt.from_user_id = buyer.id
WHERE bt.payment_id = 'cs_test_xxxxxxxxxxxxx'
ORDER BY bt.level;


-- ============================================
-- 6. CHECK BONUS WALLETS (AFTER PURCHASE)
-- ============================================
-- Check updated balances after commission distribution
SELECT 
    bw.user_id,
    u.email,
    bw.balance as current_balance,
    bw.lifetime_earnings,
    bw.withdrawn_amount,
    bw.updated_at
FROM bonus_wallets bw
JOIN auth.users u ON bw.user_id = u.id
WHERE u.email IN ('referrer1@example.com', 'referrer2@example.com', 'referrer3@example.com')
ORDER BY u.email;


-- ============================================
-- 7. VIEW ALL COMMISSIONS FOR A SPECIFIC USER
-- ============================================
-- See all commissions earned by a specific referrer
SELECT 
    bt.transaction_type,
    bt.level,
    bt.amount,
    buyer.email as from_buyer,
    bt.payment_id,
    bt.description,
    bt.created_at
FROM bonus_transactions bt
LEFT JOIN auth.users buyer ON bt.from_user_id = buyer.id
WHERE bt.user_id = '<REFERRER_USER_ID>'
AND bt.transaction_type LIKE 'commission_level%'
ORDER BY bt.created_at DESC;


-- ============================================
-- 8. SUMMARY: TOTAL COMMISSIONS BY LEVEL
-- ============================================
-- See breakdown of earnings by referral level for a specific user
SELECT 
    bt.level,
    COUNT(*) as transaction_count,
    SUM(bt.amount) as total_earned,
    MIN(bt.created_at) as first_commission,
    MAX(bt.created_at) as last_commission
FROM bonus_transactions bt
WHERE bt.user_id = '<REFERRER_USER_ID>'
AND bt.transaction_type LIKE 'commission_level%'
GROUP BY bt.level
ORDER BY bt.level;


-- ============================================
-- 9. TOP EARNERS (LEADERBOARD)
-- ============================================
SELECT 
    u.email,
    bw.lifetime_earnings,
    bw.balance as current_balance,
    bw.withdrawn_amount,
    COUNT(bt.id) as total_commissions
FROM bonus_wallets bw
JOIN auth.users u ON bw.user_id = u.id
LEFT JOIN bonus_transactions bt ON bt.user_id = bw.user_id 
    AND bt.transaction_type LIKE 'commission_level%'
GROUP BY u.email, bw.lifetime_earnings, bw.balance, bw.withdrawn_amount
ORDER BY bw.lifetime_earnings DESC
LIMIT 10;


-- ============================================
-- 10. RECENT COMMISSION ACTIVITY (LAST 24 HOURS)
-- ============================================
SELECT 
    bt.created_at,
    u.email as earner,
    bt.level,
    bt.amount,
    buyer.email as buyer,
    bt.transaction_type,
    bt.payment_id
FROM bonus_transactions bt
JOIN auth.users u ON bt.user_id = u.id
LEFT JOIN auth.users buyer ON bt.from_user_id = buyer.id
WHERE bt.transaction_type LIKE 'commission_level%'
AND bt.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY bt.created_at DESC;


-- ============================================
-- 11. VERIFY PAYMENT_TRANSACTIONS INTEGRATION
-- ============================================
-- Check if payment_transactions table captures payments correctly
SELECT 
    pt.id,
    u.email as buyer,
    pt.stripe_session_id,
    pt.amount,
    pt.status,
    pt.plan_name,
    pt.created_at,
    -- Check if commissions exist for this payment
    (SELECT COUNT(*) FROM bonus_transactions bt 
     WHERE bt.payment_id = pt.stripe_session_id) as commission_count
FROM payment_transactions pt
LEFT JOIN auth.users u ON pt.user_id = u.id
ORDER BY pt.created_at DESC
LIMIT 10;


-- ============================================
-- 12. CHECK FOR ORPHANED PAYMENTS (NO COMMISSIONS)
-- ============================================
-- Find payments that should have generated commissions but didn't
SELECT 
    pt.stripe_session_id,
    u.email as buyer,
    up.referrer_id,
    ref.email as has_referrer,
    pt.amount,
    pt.created_at,
    (SELECT COUNT(*) FROM bonus_transactions bt 
     WHERE bt.payment_id = pt.stripe_session_id) as commission_count
FROM payment_transactions pt
LEFT JOIN auth.users u ON pt.user_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN auth.users ref ON up.referrer_id = ref.id
WHERE pt.status IN ('paid', 'completed')
AND pt.amount > 0
AND pt.created_at >= NOW() - INTERVAL '7 days'
ORDER BY pt.created_at DESC;

-- If commission_count is 0 but has_referrer is NOT NULL, commissions are missing


-- ============================================
-- 13. AUDIT: COMMISSION vs PAYMENT AMOUNTS
-- ============================================
-- Verify commission percentages are correct
SELECT 
    bt.payment_id,
    pt.amount as original_payment,
    bt.level,
    bt.amount as commission_amount,
    ROUND((bt.amount / NULLIF(pt.amount, 0) * 100)::numeric, 2) as commission_percentage,
    CASE 
        WHEN bt.level = 1 THEN '50%'
        WHEN bt.level = 2 THEN '5%'
        WHEN bt.level = 3 THEN '5%'
    END as expected_percentage
FROM bonus_transactions bt
LEFT JOIN payment_transactions pt ON bt.payment_id = pt.stripe_session_id
WHERE bt.transaction_type LIKE 'commission_level%'
ORDER BY bt.created_at DESC
LIMIT 20;


-- ============================================
-- 14. CREATE TEST SCENARIO
-- ============================================
-- Use this to manually test the commission system
-- (Only run this in a test environment!)

/*
-- Step 1: Create test users (run these one by one)
INSERT INTO auth.users (id, email) VALUES 
    (gen_random_uuid(), 'test-buyer@example.com'),
    (gen_random_uuid(), 'test-referrer1@example.com'),
    (gen_random_uuid(), 'test-referrer2@example.com'),
    (gen_random_uuid(), 'test-referrer3@example.com');

-- Step 2: Set up referral chain
-- Get the user_ids from above and set up the chain:
-- referrer3 -> referrer2 -> referrer1 -> buyer

-- Step 3: Create test payment
-- Use the buyer's user_id
INSERT INTO payment_transactions (user_id, stripe_session_id, amount, status)
VALUES ('<BUYER_USER_ID>', 'test_session_123', 100.00, 'completed');

-- Step 4: Manually trigger commission (or make a real purchase)
SELECT * FROM track_multilevel_commission(
    '<BUYER_USER_ID>'::uuid,
    100.00,
    'test_session_123'::uuid
);

-- Step 5: Verify results using queries 5-8 above
*/


-- ============================================
-- 15. CLEANUP TEST DATA (BE CAREFUL!)
-- ============================================
-- Only use this to clean up test transactions

/*
-- Delete test bonus transactions
DELETE FROM bonus_transactions 
WHERE payment_id IN ('test_session_123', 'test-payment-id-123');

-- Delete test bonus wallets (only if no real data)
DELETE FROM bonus_wallets 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email LIKE 'test-%@example.com'
);

-- Delete test user profiles
DELETE FROM user_profiles 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email LIKE 'test-%@example.com'
);

-- Delete test users
DELETE FROM auth.users 
WHERE email LIKE 'test-%@example.com';
*/
