# Affiliate Commission Distribution Fix

## Problem Identified

The affiliate binding via shared links was working correctly, but automatic commission distribution was not functioning - no commissions were being generated for:
1. **Membership purchases** (Premium plan subscriptions)
2. **Token top-ups** (Token purchases)

## Root Cause

The `track_multilevel_commission()` database function was created and available in the database (from migration `20250130_multi_level_affiliate_system.sql`), but it was **never being invoked** when payments were processed.

The payment fulfillment logic in `app/api/verify-payment/route.ts` was handling:
- ✅ Token balance updates
- ✅ Premium membership creation
- ✅ Revenue transaction recording
- ❌ **Missing: Affiliate commission distribution**

## Solution Implemented

### Changes Made to `app/api/verify-payment/route.ts`

Added calls to `track_multilevel_commission()` RPC function in two places:

#### 1. Token Purchase Commission (Lines 74-89)
```typescript
// Track affiliate commission for token purchase
console.log(`💰 Tracking affiliate commission for token purchase: userId=${userId}, amount=$${price}`);
try {
  const { data: commissionData, error: commissionError } = await supabaseAdmin
    .rpc('track_multilevel_commission', {
      p_buyer_id: userId,
      p_payment_amount: price,
      p_payment_id: session.id
    });

  if (commissionError) {
    console.error("❌ Error tracking affiliate commission:", commissionError);
  } else if (commissionData && commissionData.length > 0) {
    console.log(`✅ Successfully distributed commissions to ${commissionData.length} level(s):`, commissionData);
  } else {
    console.log("ℹ️ No referrer found for this user - no commissions distributed");
  }
} catch (commissionException) {
  console.error("❌ Exception tracking affiliate commission:", commissionException);
}
```

#### 2. Membership Purchase Commission (Lines 150-165)
```typescript
// Track affiliate commission for premium membership purchase
const membershipPrice = parseFloat(session.metadata.price || "0");
if (membershipPrice > 0) {
  console.log(`💰 Tracking affiliate commission for membership purchase: userId=${userId}, amount=$${membershipPrice}`);
  try {
    const { data: commissionData, error: commissionError } = await supabaseAdmin
      .rpc('track_multilevel_commission', {
        p_buyer_id: userId,
        p_payment_amount: membershipPrice,
        p_payment_id: session.id
      });

    if (commissionError) {
      console.error("❌ Error tracking affiliate commission:", commissionError);
    } else if (commissionData && commissionData.length > 0) {
      console.log(`✅ Successfully distributed commissions to ${commissionData.length} level(s):`, commissionData);
    } else {
      console.log("ℹ️ No referrer found for this user - no commissions distributed");
    }
  } catch (commissionException) {
    console.error("❌ Exception tracking affiliate commission:", commissionException);
  }
}
```

## How It Works

### Commission Structure (from database function)
- **Level 1 (Direct Referral)**: 50% commission
- **Level 2 (2nd tier)**: 5% commission  
- **Level 3 (3rd tier)**: 5% commission

### Automatic Processing
When a payment is successfully processed:

1. **Purchase Detected**: The `verify-payment` route receives the Stripe session
2. **Tokens/Membership Added**: User receives their purchase
3. **Commission Triggered**: The `track_multilevel_commission()` function is called
4. **Referral Chain Traversed**: The function walks up the referral chain (up to 3 levels)
5. **Commissions Distributed**:
   - Updates `bonus_wallets` table (balance & lifetime_earnings)
   - Creates records in `bonus_transactions` table
   - Each transaction includes level, amount, payment_id reference

### Database Tables Updated
- **bonus_wallets**: User's commission balance and lifetime earnings
- **bonus_transactions**: Detailed commission transaction history
- **referral_tree**: Tracks multi-level referral relationships

## Testing the Fix

### 1. Check if User Has Referrer
```sql
-- Check user profile and referrer
SELECT 
    up.user_id,
    u.email as user_email,
    up.referrer_id,
    ref.email as referrer_email,
    up.referral_code
FROM user_profiles up
LEFT JOIN auth.users u ON up.user_id = u.id
LEFT JOIN auth.users ref ON up.referrer_id = ref.id
WHERE u.email = 'test-user@example.com';
```

### 2. Verify Commission Was Generated
```sql
-- Check bonus transactions for a specific user
SELECT 
    bt.*,
    u.email as earner_email,
    buyer.email as buyer_email
FROM bonus_transactions bt
LEFT JOIN auth.users u ON bt.user_id = u.id
LEFT JOIN auth.users buyer ON bt.from_user_id = buyer.id
WHERE bt.user_id = '<referrer_user_id>'
ORDER BY bt.created_at DESC;
```

### 3. Check Bonus Wallet Balance
```sql
-- Check wallet balance for referrer
SELECT 
    bw.*,
    u.email
FROM bonus_wallets bw
LEFT JOIN auth.users u ON bw.user_id = u.id
WHERE u.email = 'referrer@example.com';
```

### 4. Test End-to-End Commission Flow
```sql
-- VIEW: Complete commission flow for a payment
SELECT 
    bt.transaction_type,
    bt.level,
    bt.amount,
    u.email as earner,
    buyer.email as buyer,
    bt.payment_id,
    bt.created_at
FROM bonus_transactions bt
LEFT JOIN auth.users u ON bt.user_id = u.id
LEFT JOIN auth.users buyer ON bt.from_user_id = buyer.id
WHERE bt.payment_id = '<stripe_session_id>'
ORDER BY bt.level;
```

## Expected Behavior After Fix

### Scenario: User with 3-Level Referral Chain
```
User A (Level 3) → referred User B (Level 2) → referred User C (Level 1) → referred User D (Buyer)
```

When User D purchases $100 in tokens:
- **User C** (Level 1): Gets **$50** (50% commission)
- **User B** (Level 2): Gets **$5** (5% commission)
- **User A** (Level 3): Gets **$5** (5% commission)

All three transactions are created instantly and reflected in their bonus wallets.

## Monitoring & Logs

The fix includes comprehensive logging:
- 💰 Commission tracking initiation
- ✅ Successful commission distribution  
- ❌ Errors during commission processing
- ℹ️ Info messages when no referrer exists

Check server logs after purchases to verify commission distribution.

## Files Modified

1. **app/api/verify-payment/route.ts** - Added commission tracking calls

## Files Referenced (No Changes)

1. **supabase/migrations/20250130_multi_level_affiliate_system.sql** - Contains the commission function
2. **app/api/track-affiliate-conversion/route.ts** - Old affiliate system (different approach)

## Migration Required

❌ **No new migration needed** - The database function already exists. This was purely an API integration fix.

## Verification Checklist

- [x] Commission function exists in database
- [x] Commission function is called on token purchases
- [x] Commission function is called on membership purchases
- [x] Error handling implemented
- [x] Logging added for debugging
- [x] Documentation created

## Notes

- The commission system is **non-blocking** - if it fails, the purchase still completes successfully
- Commissions are only distributed if the user has a referrer in their `user_profiles` record
- The system automatically handles 1, 2, or 3 level referral chains
- All commission transactions include the original payment_id for audit trails

## Support

If commissions are still not appearing after this fix:

1. Check server logs for commission-related errors
2. Verify the user has a `referrer_id` set in `user_profiles` table
3. Ensure the `track_multilevel_commission()` function exists in the database
4. Check `bonus_wallets` and `bonus_transactions` tables for entries
5. Verify RLS policies allow the admin client to write to these tables
