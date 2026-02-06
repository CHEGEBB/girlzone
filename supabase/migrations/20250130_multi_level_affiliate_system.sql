-- Multi-Level Affiliate System with USDT Withdrawals

-- Create user profiles table for referral tracking (since we can't modify auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referrer_id ON user_profiles(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON user_profiles FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create bonus wallet table for tracking earnings
CREATE TABLE IF NOT EXISTS bonus_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    lifetime_earnings DECIMAL(12, 2) DEFAULT 0.00,
    withdrawn_amount DECIMAL(12, 2) DEFAULT 0.00,
    usdt_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create referral tree table for tracking multi-level structure
CREATE TABLE IF NOT EXISTS referral_tree (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, referrer_id)
);

-- Create bonus transactions table for detailed tracking
CREATE TABLE IF NOT EXISTS bonus_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'commission_level1', 'commission_level2', 'commission_level3', 'withdrawal', 'adjustment'
    amount DECIMAL(12, 2) NOT NULL,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    payment_id UUID, -- Reference to the payment that triggered this
    level INTEGER, -- Which referral level (1, 2, or 3)
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create USDT withdrawal requests table
CREATE TABLE IF NOT EXISTS usdt_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    usdt_address TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
    tx_hash TEXT, -- Transaction hash after processing
    admin_note TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bonus_wallets_user_id ON bonus_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_tree_user_id ON referral_tree(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_tree_referrer_id ON referral_tree(referrer_id);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_user_id ON bonus_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_from_user ON bonus_transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_usdt_withdrawals_user_id ON usdt_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_usdt_withdrawals_status ON usdt_withdrawals(status);

-- Enable RLS
ALTER TABLE bonus_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_tree ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usdt_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bonus_wallets
CREATE POLICY "Users can view their own bonus wallet"
ON bonus_wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet address"
ON bonus_wallets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bonus wallets"
ON bonus_wallets FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- RLS Policies for referral_tree
CREATE POLICY "Users can view their referral tree"
ON referral_tree FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referral trees"
ON referral_tree FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- RLS Policies for bonus_transactions
CREATE POLICY "Users can view their own transactions"
ON bonus_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON bonus_transactions FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- RLS Policies for usdt_withdrawals
CREATE POLICY "Users can view their own withdrawals"
ON usdt_withdrawals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawals"
ON usdt_withdrawals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all withdrawals"
ON usdt_withdrawals FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create triggers
CREATE TRIGGER update_bonus_wallets_updated_at
BEFORE UPDATE ON bonus_wallets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
        
        -- Check if code already exists
        SELECT EXISTS(
            SELECT 1 FROM user_profiles WHERE referral_code = new_code
        ) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, referral_code)
    VALUES (NEW.id, generate_referral_code())
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create profile for new users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_profile();

-- Function to track multi-level commission
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
        -- Get the referrer for current user
        SELECT referrer_id INTO v_referrer
        FROM user_profiles
        WHERE user_id = v_current_user;
        
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

-- Function to get user's downlines
CREATE OR REPLACE FUNCTION get_user_downlines(p_user_id UUID, p_max_level INTEGER DEFAULT 3)
RETURNS TABLE (
    downline_id UUID,
    downline_email TEXT,
    level INTEGER,
    total_earnings DECIMAL,
    joined_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_tree AS (
        -- Base case: direct referrals (level 1)
        SELECT 
            u.id as downline_id,
            u.email as downline_email,
            1 as level,
            u.created_at as joined_date
        FROM auth.users u
        INNER JOIN user_profiles up ON u.id = up.user_id
        WHERE up.referrer_id = p_user_id
        
        UNION ALL
        
        -- Recursive case: get referrals of referrals
        SELECT 
            u.id,
            u.email,
            dt.level + 1,
            u.created_at
        FROM auth.users u
        INNER JOIN user_profiles up ON u.id = up.user_id
        INNER JOIN downline_tree dt ON up.referrer_id = dt.downline_id
        WHERE dt.level < p_max_level
    )
    SELECT 
        dt.downline_id,
        dt.downline_email,
        dt.level,
        COALESCE(SUM(bt.amount), 0) as total_earnings,
        dt.joined_date
    FROM downline_tree dt
    LEFT JOIN bonus_transactions bt ON bt.from_user_id = dt.downline_id
    GROUP BY dt.downline_id, dt.downline_email, dt.level, dt.joined_date
    ORDER BY dt.level, dt.joined_date DESC;
END;
$$ LANGUAGE plpgsql;
