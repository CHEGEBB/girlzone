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

