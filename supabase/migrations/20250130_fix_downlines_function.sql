-- Fix the get_user_downlines function to work with RLS

-- Drop and recreate with SECURITY DEFINER
DROP FUNCTION IF EXISTS get_user_downlines(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_user_downlines(p_user_id UUID, p_max_level INTEGER DEFAULT 3)
RETURNS TABLE (
    downline_id UUID,
    downline_email CHARACTER VARYING(255),
    level INTEGER,
    total_earnings DECIMAL,
    joined_date TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;
