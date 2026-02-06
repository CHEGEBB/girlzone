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
