-- Add monthly_bonus_tokens to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS monthly_bonus_tokens INTEGER DEFAULT 100;

-- Update grant_monthly_tokens_to_subscribers function to use per-plan tokens
CREATE OR REPLACE FUNCTION grant_monthly_tokens_to_subscribers()
RETURNS TABLE (
  user_id UUID,
  tokens_granted INTEGER,
  subscription_status TEXT,
  message TEXT
) AS $$
DECLARE
  v_current_month DATE;
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
        (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at,
        COALESCE(sp.monthly_bonus_tokens, 100) as plan_bonus_tokens
      FROM payment_transactions pt
      LEFT JOIN subscription_plans sp ON pt.plan_id = sp.id
      WHERE pt.status = 'completed'
        AND pt.plan_id IS NOT NULL
        AND (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW()
      ORDER BY pt.user_id, pt.created_at DESC
    )
    SELECT 
      s.user_id,
      s.plan_name,
      s.plan_id,
      s.expires_at,
      s.plan_bonus_tokens
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
        v_user_record.plan_bonus_tokens,
        v_user_record.expires_at,
        v_user_record.plan_name,
        v_user_record.plan_id
      );
      
      -- Update user token balance
      INSERT INTO user_tokens (user_id, balance, created_at, updated_at)
      VALUES (
        v_user_record.user_id,
        v_user_record.plan_bonus_tokens,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_tokens.balance + v_user_record.plan_bonus_tokens,
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
        v_user_record.plan_bonus_tokens,
        'subscription_grant',
        'Monthly subscription tokens for ' || TO_CHAR(v_current_month, 'Month YYYY'),
        jsonb_build_object(
          'grant_month', v_current_month,
          'plan_name', v_user_record.plan_name,
          'expires_at', v_user_record.expires_at,
          'bonus_amount', v_user_record.plan_bonus_tokens
        ),
        NOW()
      );
      
      v_granted_count := v_granted_count + 1;
      
      -- Return result for this user
      user_id := v_user_record.user_id;
      tokens_granted := v_user_record.plan_bonus_tokens;
      subscription_status := 'active';
      message := 'Successfully granted ' || v_user_record.plan_bonus_tokens || ' tokens';
      RETURN NEXT;
      
      RAISE NOTICE 'Granted % tokens to user %', v_user_record.plan_bonus_tokens, v_user_record.user_id;
      
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

-- Update grant_tokens_to_subscriber for single user grants
CREATE OR REPLACE FUNCTION grant_tokens_to_subscriber(p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  tokens_granted INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_month DATE;
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
    (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at,
    COALESCE(sp.monthly_bonus_tokens, 100) as plan_bonus_tokens
  INTO v_subscription
  FROM payment_transactions pt
  LEFT JOIN subscription_plans sp ON pt.plan_id = sp.id
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
      v_subscription.plan_bonus_tokens,
      v_subscription.expires_at,
      v_subscription.plan_name,
      v_subscription.plan_id
    );
    
    -- Update user token balance
    INSERT INTO user_tokens (user_id, balance, created_at, updated_at)
    VALUES (p_user_id, v_subscription.plan_bonus_tokens, NOW(), NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = user_tokens.balance + v_subscription.plan_bonus_tokens,
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
      v_subscription.plan_bonus_tokens,
      'subscription_grant',
      'Monthly subscription tokens for ' || TO_CHAR(v_current_month, 'Month YYYY'),
      jsonb_build_object(
        'grant_month', v_current_month,
        'plan_name', v_subscription.plan_name,
        'expires_at', v_subscription.expires_at,
        'bonus_amount', v_subscription.plan_bonus_tokens
      ),
      NOW()
    );
    
    success := true;
    tokens_granted := v_subscription.plan_bonus_tokens;
    message := 'Successfully granted ' || v_subscription.plan_bonus_tokens || ' tokens';
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
