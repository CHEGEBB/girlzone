# 🔧 Fix: Check Constraint Violation Error

## ❌ Error You're Seeing

```
ERROR: check constraint "token_transactions_type_check" of relation "token_transactions" is violated by some row
```

## 🔍 What This Means

You have existing transaction records in your `token_transactions` table with types that aren't in the standard list. The migration tried to add a constraint that only allows specific types, but your existing data doesn't match.

---

## ✅ Solution (Choose One)

### **Option 1: Use the FIXED Migration (RECOMMENDED) ⭐**

I created a fixed version that automatically detects and includes all your existing transaction types.

**File:** `20250122_subscription_monthly_tokens_FIXED.sql`

**Steps:**
1. Open Supabase SQL Editor
2. Copy the entire contents of `20250122_subscription_monthly_tokens_FIXED.sql`
3. Paste and Run
4. Done! ✅

**What it does differently:**
- Scans your existing `token_transactions` data first
- Finds all unique transaction types you're using
- Includes them all in the new constraint
- Adds `'subscription_grant'` to the allowed types
- No data loss, no conflicts

---

### **Option 2: Check Your Data First (Diagnostic)**

Want to see what's causing the issue?

**Run this query:**
```sql
-- See all transaction types in your database
SELECT 
  type,
  COUNT(*) as count
FROM token_transactions
GROUP BY type
ORDER BY count DESC;
```

**Common culprits:**
- `'manual_stripe_verification'` (from manual payment verification)
- Custom types you may have added
- Typos in transaction types

Then use the FIXED migration which handles all of them automatically.

---

### **Option 3: Clean Up Data Manually (Advanced)**

If you want to standardize your transaction types first:

```sql
-- Check what types exist
SELECT DISTINCT type FROM token_transactions;

-- Update non-standard types to standard ones
-- Example: Change 'manual_stripe_verification' to 'purchase'
UPDATE token_transactions 
SET type = 'purchase' 
WHERE type = 'manual_stripe_verification';

-- Then run the original migration
```

**Standard types:**
- `'purchase'` - Token purchases
- `'usage'` - Token consumption
- `'refund'` - Refunded tokens
- `'bonus'` - Bonus/free tokens
- `'subscription_grant'` - Monthly subscription tokens (new)

---

## 🎯 Quick Fix (TL;DR)

**Just run this file:**
```
20250122_subscription_monthly_tokens_FIXED.sql
```

It automatically handles whatever data you have. No manual cleanup needed.

---

## 🔍 Diagnostic Script

To see exactly what's in your database, run:
```
CHECK_EXISTING_DATA.sql
```

This shows:
- All transaction types you're using
- How many of each
- When they were created
- Current constraint definition

---

## ✅ After Running the Fixed Migration

Test that everything works:

```sql
-- 1. Check the new constraint
SELECT 
  conname,
  pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'token_transactions_type_check';

-- 2. Grant tokens to test
SELECT * FROM grant_monthly_tokens_to_subscribers();

-- 3. Verify grants worked
SELECT * FROM subscription_token_grants 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🆘 Still Having Issues?

### Check if the function exists:
```sql
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'grant_monthly_tokens_to_subscribers'
) as function_exists;
```

### Check if the table exists:
```sql
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE tablename = 'subscription_token_grants'
) as table_exists;
```

### View detailed error logs:
Check the Supabase logs for detailed error messages.

---

## 🎉 Success!

Once the FIXED migration runs successfully, you can:

1. **Grant tokens:** `SELECT * FROM grant_monthly_tokens_to_subscribers();`
2. **Monitor grants:** See `MANUAL_EXECUTION_COMMANDS.sql`
3. **Set up automation:** Run `20250122_subscription_tokens_automation.sql`

---

## 📊 What Changed in the Fixed Version

**Original Migration:**
- Hard-coded constraint: `CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'subscription_grant'))`
- Failed if you had other types

**Fixed Migration:**
- Dynamically checks your existing data
- Includes all types you're currently using
- Adds the new `'subscription_grant'` type
- Handles edge cases gracefully
- Continues even if constraint update fails

---

## 🔒 Safety Features

The fixed migration:
- ✅ Checks before dropping constraints
- ✅ Preserves all existing data
- ✅ Logs all operations with NOTICE messages
- ✅ Includes error handling
- ✅ Won't break your existing transactions

---

## 💡 Pro Tip

After running the fixed migration successfully, consider standardizing your transaction types going forward. Use the standard types for new transactions:
- `'purchase'`, `'usage'`, `'refund'`, `'bonus'`, `'subscription_grant'`

This makes reporting and analytics easier!

---

## 📞 Next Steps

1. ✅ Run `20250122_subscription_monthly_tokens_FIXED.sql`
2. ✅ Test with `SELECT * FROM grant_monthly_tokens_to_subscribers();`
3. ✅ Set up monthly automation (optional)
4. ✅ You're done! 🚀

