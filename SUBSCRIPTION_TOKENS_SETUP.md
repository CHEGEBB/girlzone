# 📋 Subscription Monthly Token Grants Setup Guide

This guide explains how to set up and manage automatic monthly token grants (100 tokens/month) for active subscribers.

---

## 🚀 Quick Start - Manual Execution

### Step 1: Run the Main Migration

Execute this SQL file in your Supabase SQL Editor:

```bash
supabase/migrations/20250122_subscription_monthly_tokens.sql
```

Or copy and paste the contents directly into your Supabase SQL Editor and run it.

**This will create:**
- ✅ `subscription_token_grants` table to track grants
- ✅ `grant_monthly_tokens_to_subscribers()` function to grant tokens to all active subscribers
- ✅ `grant_tokens_to_subscriber(user_id)` function to grant tokens to a specific user
- ✅ `check_subscription_token_status(user_id)` function to check user's subscription status

---

## 💡 Manual Usage

### Grant Tokens to All Active Subscribers (Current Month)

Run this in your Supabase SQL Editor at the beginning of each month:

```sql
SELECT * FROM grant_monthly_tokens_to_subscribers();
```

**Output:** Returns a list of users who received tokens, showing:
- `user_id` - User UUID
- `tokens_granted` - Number of tokens granted (100)
- `subscription_status` - Status (active/error)
- `message` - Success or error message

### Grant Tokens to a Specific User

```sql
SELECT * FROM grant_tokens_to_subscriber('user-uuid-here');
```

**Example:**
```sql
SELECT * FROM grant_tokens_to_subscriber('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
```

### Check a User's Subscription Token Status

```sql
SELECT * FROM check_subscription_token_status('user-uuid-here');
```

**Output shows:**
- `has_active_subscription` - Boolean
- `subscription_expires_at` - Expiration timestamp
- `plan_name` - Subscription plan name
- `tokens_granted_this_month` - Whether tokens were already granted
- `last_grant_date` - Date of last token grant
- `tokens_granted` - Amount of last grant
- `current_token_balance` - User's current token balance

---

## 📊 Monitoring Queries

### View All Token Grants for Current Month

```sql
SELECT 
  stg.user_id,
  au.email,
  stg.tokens_granted,
  stg.plan_name,
  stg.subscription_expires_at,
  stg.created_at,
  ut.balance as current_balance
FROM subscription_token_grants stg
JOIN auth.users au ON stg.user_id = au.id
LEFT JOIN user_tokens ut ON stg.user_id = ut.user_id
WHERE stg.grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
ORDER BY stg.created_at DESC;
```

### View Active Subscribers Without Token Grants This Month

```sql
SELECT * FROM pending_token_grants;
```

### View All Token Grant History

```sql
SELECT 
  stg.*,
  au.email
FROM subscription_token_grants stg
JOIN auth.users au ON stg.user_id = au.id
ORDER BY stg.created_at DESC
LIMIT 100;
```

### Count Active Subscribers

```sql
SELECT COUNT(DISTINCT user_id) as active_subscribers
FROM payment_transactions
WHERE status = 'completed'
  AND plan_id IS NOT NULL
  AND (created_at + INTERVAL '1 month' * COALESCE(plan_duration, 1)) > NOW();
```

---

## 🤖 Automatic Execution (Optional)

### Option 1: pg_cron (Supabase Pro+)

If you have Supabase Pro or above, you can use pg_cron for automatic monthly execution:

1. Run the automation setup file:
```bash
supabase/migrations/20250122_subscription_tokens_automation.sql
```

2. This schedules the job to run automatically on the 1st of every month at 00:00 UTC.

3. Monitor scheduled jobs:
```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- View job execution history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Option 2: External Cron Job

If pg_cron is not available, you can create an API endpoint and trigger it monthly using:

- **GitHub Actions** - Scheduled workflow
- **Vercel/Netlify** - Scheduled functions
- **Cloud Schedulers** - AWS EventBridge, GCP Cloud Scheduler
- **Cron services** - cron-job.org, EasyCron

**Example API endpoint** (`app/api/grant-subscription-tokens/route.ts`):

```typescript
import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  // Add authentication check here
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('grant_monthly_tokens_to_subscribers')
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ 
    success: true, 
    grants: data 
  })
}
```

### Option 3: Manual Monthly Execution

Set a monthly reminder and run:
```sql
SELECT * FROM grant_monthly_tokens_to_subscribers();
```

---

## 🔍 How It Works

1. **Subscription Detection:**
   - Checks `payment_transactions` table for completed payments
   - Identifies users with active subscriptions (not expired)
   - Calculates expiration date based on plan duration

2. **Token Grant Logic:**
   - Grants 100 tokens per month
   - Only grants once per user per month (prevents duplicates)
   - Creates record in `subscription_token_grants` table
   - Updates `user_tokens` balance
   - Records transaction in `token_transactions` with type `'subscription_grant'`

3. **Safety Features:**
   - Uses `UNIQUE(user_id, grant_month)` constraint to prevent duplicate grants
   - Wraps each user's grant in a transaction
   - Continues processing even if one user fails
   - Logs all operations with NOTICE/WARNING messages

---

## 🛠️ Troubleshooting

### Tokens Not Being Granted

**Check if user has active subscription:**
```sql
SELECT 
  pt.user_id,
  au.email,
  pt.plan_name,
  pt.created_at,
  (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at,
  CASE 
    WHEN (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW() 
    THEN 'Active' 
    ELSE 'Expired' 
  END as status
FROM payment_transactions pt
JOIN auth.users au ON pt.user_id = au.id
WHERE pt.user_id = 'user-uuid-here'
  AND pt.plan_id IS NOT NULL
ORDER BY pt.created_at DESC;
```

### Duplicate Grant Error

If you see "duplicate key value violates unique constraint":
- Tokens were already granted this month
- This is expected behavior (prevents double-grants)
- Check grant history:
```sql
SELECT * FROM subscription_token_grants 
WHERE user_id = 'user-uuid-here'
ORDER BY grant_month DESC;
```

### Force Re-Grant for Testing

**⚠️ Use with caution - only for testing/debugging:**
```sql
-- Delete the current month's grant record
DELETE FROM subscription_token_grants 
WHERE user_id = 'user-uuid-here' 
  AND grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE;

-- Then grant again
SELECT * FROM grant_tokens_to_subscriber('user-uuid-here');
```

---

## 📈 Statistics & Reports

### Monthly Grant Summary

```sql
SELECT 
  TO_CHAR(grant_month, 'Month YYYY') as month,
  COUNT(*) as total_grants,
  SUM(tokens_granted) as total_tokens_granted,
  COUNT(DISTINCT plan_name) as unique_plans
FROM subscription_token_grants
GROUP BY grant_month
ORDER BY grant_month DESC;
```

### User Grant History

```sql
SELECT 
  au.email,
  COUNT(*) as total_months_subscribed,
  SUM(stg.tokens_granted) as lifetime_tokens_received,
  MIN(stg.grant_month) as first_grant,
  MAX(stg.grant_month) as last_grant
FROM subscription_token_grants stg
JOIN auth.users au ON stg.user_id = au.id
WHERE stg.user_id = 'user-uuid-here'
GROUP BY au.email;
```

---

## 🔒 Security Notes

- All functions use `SECURITY DEFINER` to run with elevated privileges
- Row Level Security (RLS) is enabled on `subscription_token_grants`
- Users can only view their own grant records
- Server/admin can manage all records

---

## 📅 Maintenance

### Cleanup Old Records (Optional)

To keep database size manageable, you can delete grant records older than 12 months:

```sql
SELECT cleanup_old_token_grants();
```

This is already scheduled if you're using pg_cron (runs quarterly).

---

## 🎯 Testing Checklist

- [ ] Run the main migration
- [ ] Create a test subscription via the premium page
- [ ] Check subscription status: `SELECT * FROM check_subscription_token_status('user-id');`
- [ ] Grant tokens manually: `SELECT * FROM grant_tokens_to_subscriber('user-id');`
- [ ] Verify token balance increased
- [ ] Check grant was recorded: `SELECT * FROM subscription_token_grants WHERE user_id = 'user-id';`
- [ ] Try granting again (should fail with "already granted" message)
- [ ] Check `pending_token_grants` view for users needing tokens

---

## 📞 Support

If you encounter any issues:
1. Check Supabase logs for error messages
2. Verify subscription status with `check_subscription_token_status()`
3. Review `payment_transactions` to ensure subscription exists
4. Check `pending_token_grants` view for eligible users

---

## 🎉 You're All Set!

Your subscription token grant system is now ready. Remember to:
- Run `grant_monthly_tokens_to_subscribers()` monthly (manually or automatically)
- Monitor the `pending_token_grants` view
- Review grant history regularly

Happy granting! 🚀
