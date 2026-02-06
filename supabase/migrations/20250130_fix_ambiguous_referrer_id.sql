-- Fix ambiguous referrer_id in track_multilevel_commission function

CREATE OR REPLACE FUNCTION track_multilevel_commission(
    p_buyer_id UUID,
    p_payment_amount DECIMAL,
    p_payment_id UUID
)
RETURNS TABLE (
    level INTEGER,
    referrer_id UUID,
    commission_amount DECIMAL
) AS $$
DECLARE
    v_current_user UUID;
    v_referrer UUID;
    v_level INTEGER;
    v_commission_rate DECIMAL;
    v_commission_amount DECIMAL;
BEGIN
    v_current_user := p_buyer_id;
    v_level := 1;
    
    -- Loop through up to 3 levels
    WHILE v_level <= 3 LOOP
        -- Get the referrer for current user (fixed: added table alias to avoid ambiguity)
        SELECT up.referrer_id INTO v_referrer
        FROM user_profiles up
        WHERE up.user_id = v_current_user;
        
        -- Exit if no referrer
        EXIT WHEN v_referrer IS NULL;
        
        -- Determine commission rate based on level
        v_commission_rate := CASE
            WHEN v_level = 1 THEN 0.50  -- 50%
            WHEN v_level = 2 THEN 0.05  -- 5%
            WHEN v_level = 3 THEN 0.05  -- 5%
            ELSE 0
        END;
        
        v_commission_amount := p_payment_amount * v_commission_rate;
        
        -- Update bonus wallet
        INSERT INTO bonus_wallets (user_id, balance, lifetime_earnings)
        VALUES (v_referrer, v_commission_amount, v_commission_amount)
        ON CONFLICT (user_id) DO UPDATE
        SET 
            balance = bonus_wallets.balance + v_commission_amount,
            lifetime_earnings = bonus_wallets.lifetime_earnings + v_commission_amount,
            updated_at = CURRENT_TIMESTAMP;
        
        -- Record transaction
        INSERT INTO bonus_transactions (
            user_id,
            transaction_type,
            amount,
            from_user_id,
            payment_id,
            level,
            description,
            status
        ) VALUES (
            v_referrer,
            'commission_level' || v_level,
            v_commission_amount,
            p_buyer_id,
            p_payment_id,
            v_level,
            'Level ' || v_level || ' commission from referral purchase',
            'completed'
        );
        
        -- Return the commission info
        RETURN QUERY SELECT v_level, v_referrer, v_commission_amount;
        
        -- Move up the referral chain
        v_current_user := v_referrer;
        v_level := v_level + 1;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;
