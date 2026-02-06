-- =====================================================
-- COMPLETE SETUP FOR SUBSCRIPTION TOKEN GRANTS
-- =====================================================
-- Run this ENTIRE file in Supabase SQL Editor
-- It will create everything you need in the correct order
-- =====================================================

-- =====================================================
-- STEP 1: Create payment_transactions table (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  payment_method TEXT,
  payment_method_details JSONB,
  billing_details JSONB,
  subscription_id TEXT,
  plan_id UUID REFERENCES subscription_plans(id),
  plan_name TEXT,
  plan_duration INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payment_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payment_transactions (status);
CREATE INDEX IF NOT EXISTS payments_stripe_session_id_idx ON payment_transactions (stripe_session_id);
CREATE INDEX IF NOT EXISTS payments_stripe_payment_intent_id_idx ON payment_transactions (stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS payments_plan_id_idx ON payment_transactions (plan_id);

-- Enable Row Level Security
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_transactions' 
    AND policyname = 'Users can view their own payment_transactions'
  ) THEN
    CREATE POLICY "Users can view their own payment_transactions"
      ON payment_transactions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_transactions' 
    AND policyname = 'Server can manage payment_transactions'
  ) THEN
    CREATE POLICY "Server can manage payment_transactions"
      ON payment_transactions FOR ALL
      USING (true);
  END IF;
END $$;

-- =====================================================
-- STEP 2: Create subscription_token_grants table
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_token_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_month DATE NOT NULL,
  tokens_granted INTEGER NOT NULL DEFAULT 500,
  subscription_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  plan_name TEXT,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, grant_month)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS subscription_token_grants_user_id_idx ON subscription_token_grants (user_id);
CREATE INDEX IF NOT EXISTS subscription_token_grants_grant_month_idx ON subscription_token_grants (grant_month);
CREATE INDEX IF NOT EXISTS subscription_token_grants_created_at_idx ON subscription_token_grants (created_at DESC);

-- Enable RLS
ALTER TABLE subscription_token_grants ENABLE ROW LEVEL SECURITY;

-- Create policies
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
-- STEP 3: Update token_transactions constraint
-- =====================================================
DO $$ 
DECLARE
  existing_types TEXT[];
  new_constraint_def TEXT;
BEGIN
  -- Get all unique transaction types
  SELECT array_agg(DISTINCT type) INTO existing_types
  FROM token_transactions;
  
  RAISE NOTICE 'Existing transaction types: %', existing_types;
  
  -- Drop existing constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'token_transactions_type_check'
  ) THEN
    ALTER TABLE token_transactions DROP CONSTRAINT token_transactions_type_check;
    RAISE NOTICE 'Dropped existing constraint';
  END IF;
  
  -- Build new constraint
  new_constraint_def := '''purchase'', ''usage'', ''refund'', ''bonus'', ''subscription_grant''';
  
  -- Add custom types if they exist
  IF existing_types IS NOT NULL THEN
    FOR i IN 1..array_length(existing_types, 1) LOOP
      IF existing_types[i] NOT IN ('purchase', 'usage', 'refund', 'bonus', 'subscription_grant') THEN
        new_constraint_def := new_constraint_def || ', ''' || existing_types[i] || '''';
        RAISE NOTICE 'Including existing type: %', existing_types[i];
      END IF;
    END LOOP;
  END IF;
  
  -- Create new constraint
  EXECUTE format(
    'ALTER TABLE token_transactions ADD CONSTRAINT token_transactions_type_check CHECK (type IN (%s))',
    new_constraint_def
  );
  
  RAISE NOTICE 'Created new constraint';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error with constraint: %. Continuing...', SQLERRM;
END $$;

-- =====================================================
-- STEP 4: Create grant_monthly_tokens_to_subscribers function
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
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  RAISE NOTICE 'Starting token grant for month: %', v_current_month;
  
  FOR v_user_record IN
    WITH active_subscriptions AS (
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
      SELECT 1 
      FROM subscription_token_grants stg
      WHERE stg.user_id = s.user_id 
        AND stg.grant_month = v_current_month
    )
  LOOP
    BEGIN
      INSERT INTO subscription_token_grants (
        user_id, grant_month, tokens_granted,
        subscription_expires_at, plan_name, plan_id
      ) VALUES (
        v_user_record.user_id, v_current_month, v_tokens_per_month,
        v_user_record.expires_at, v_user_record.plan_name, v_user_record.plan_id
      );
      
      INSERT INTO user_tokens (user_id, balance, created_at, updated_at)
      VALUES (v_user_record.user_id, v_tokens_per_month, NOW(), NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_tokens.balance + v_tokens_per_month,
        updated_at = NOW();
      
      INSERT INTO token_transactions (
        user_id, amount, type, description, metadata, created_at
      ) VALUES (
        v_user_record.user_id, v_tokens_per_month, 'subscription_grant',
        'Monthly subscription tokens for ' || TO_CHAR(v_current_month, 'Month YYYY'),
        jsonb_build_object(
          'grant_month', v_current_month,
          'plan_name', v_user_record.plan_name,
          'expires_at', v_user_record.expires_at
        ),
        NOW()
      );
      
      v_granted_count := v_granted_count + 1;
      
      user_id := v_user_record.user_id;
      tokens_granted := v_tokens_per_month;
      subscription_status := 'active';
      message := 'Successfully granted ' || v_tokens_per_month || ' tokens';
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      user_id := v_user_record.user_id;
      tokens_granted := 0;
      subscription_status := 'error';
      message := 'Error: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
  
  RAISE NOTICE 'Completed. Granted to % users', v_granted_count;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: Create grant_tokens_to_subscriber function
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
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  SELECT 
    pt.user_id, pt.plan_name, pt.plan_id, pt.plan_duration,
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
    message := 'No active subscription found';
    RETURN NEXT;
    RETURN;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM subscription_token_grants 
    WHERE user_id = p_user_id AND grant_month = v_current_month
  ) THEN
    success := false;
    tokens_granted := 0;
    message := 'Tokens already granted this month';
    RETURN NEXT;
    RETURN;
  END IF;
  
  BEGIN
    INSERT INTO subscription_token_grants (
      user_id, grant_month, tokens_granted,
      subscription_expires_at, plan_name, plan_id
    ) VALUES (
      p_user_id, v_current_month, v_tokens_per_month,
      v_subscription.expires_at, v_subscription.plan_name, v_subscription.plan_id
    );
    
    INSERT INTO user_tokens (user_id, balance, created_at, updated_at)
    VALUES (p_user_id, v_tokens_per_month, NOW(), NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = user_tokens.balance + v_tokens_per_month,
      updated_at = NOW();
    
    INSERT INTO token_transactions (
      user_id, amount, type, description, metadata, created_at
    ) VALUES (
      p_user_id, v_tokens_per_month, 'subscription_grant',
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
-- STEP 6: Create check_subscription_token_status function
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
      pt.user_id, pt.plan_name,
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
    SELECT grant_month, tokens_granted
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
    (active_sub.user_id IS NOT NULL),
    active_sub.expires_at,
    active_sub.plan_name,
    EXISTS (
      SELECT 1 FROM subscription_token_grants 
      WHERE user_id = p_user_id AND grant_month = v_current_month
    ),
    last_grant.grant_month,
    last_grant.tokens_granted,
    COALESCE(token_balance.balance, 0)
  FROM active_sub
  LEFT JOIN last_grant ON true
  LEFT JOIN token_balance ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SETUP COMPLETE! 
-- =====================================================
-- You can now run:
-- SELECT * FROM grant_monthly_tokens_to_subscribers();
-- =====================================================

