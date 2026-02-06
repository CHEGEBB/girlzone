# 🎁 Premium Token Rewards System - Complete Setup Guide

This guide explains how to set up and use the automatic 100 tokens per month system for premium subscribers.

---

## 📋 Overview

**What This System Does:**
- ✅ Grants 100 tokens **immediately** when a user purchases a premium subscription
- ✅ Grants 100 tokens **every month** to all active premium users (via external cron job)
- ✅ Prevents duplicate grants (can only grant once per user per month)
- ✅ Tracks all token grants in the database

---

## 🚀 Quick Setup

### Step 1: Database Migration (If Not Already Done)

Run this SQL migration in your Supabase SQL Editor:

```bash
supabase/migrations/20250122_subscription_monthly_tokens.sql
```

This creates:
- `subscription_token_grants` table
- `grant_monthly_tokens_to_subscribers()` function
- `grant_tokens_to_subscriber(user_id)` function
- All necessary database schemas

### Step 2: Add Environment Variable

Add this to your `.env.local` file (and production environment):

```bash
# Generate a secure random string
# Linux/Mac: openssl rand -base64 32
# Or use: https://generate-secret.vercel.app/32

CRON_SECRET=your_secure_random_string_here
```

**Important:** Keep this secret secure! It protects your cron endpoint from unauthorized access.

### Step 3: Deploy Your Application

Deploy your updated application to production (Vercel, etc.)

### Step 4: Set Up External Cron Job

Choose one of these options:

---

## 🔧 Cron Job Setup Options

### Option 1: cron-job.org (Recommended - Free & Easy)

1. **Sign up** at [cron-job.org](https://cron-job.org)
2. **Create a new cron job:**
   - **Title:** "Premium Token Grants"
   - **URL:** `https://your-domain.com/api/cron/grant-subscription-tokens`
   - **Method:** POST
   - **Schedule:** 
     - Pattern: `0 0 1 * *` (1st day of every month at midnight)
     - Or use visual editor: "Monthly" → "1st day" → "00:00 UTC"
   - **Headers:** Click "Add Request Header"
     - Header Name: `Authorization`
     - Header Value: `Bearer YOUR_CRON_SECRET` (replace with your actual secret)
3. **Save and Enable** the cron job

### Option 2: EasyCron (Free Tier Available)

1. **Sign up** at [easycron.com](https://www.easycron.com/)
2. **Create new cron job:**
   - **URL:** `https://your-domain.com/api/cron/grant-subscription-tokens`
   - **Cron Expression:** `0 0 1 * *`
   - **HTTP Method:** POST
   - **HTTP Headers:** `Authorization: Bearer YOUR_CRON_SECRET`
3. **Save** the job

### Option 3: GitHub Actions (Free for Public Repos)

Create `.github/workflows/monthly-token-grant.yml`:

```yaml
name: Monthly Token Grant

on:
  schedule:
    # Run on the 1st of every month at 00:00 UTC
    - cron: '0 0 1 * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  grant-tokens:
    runs-on: ubuntu-latest
    steps:
      - name: Grant Monthly Tokens
        run: |
          curl -X POST https://your-domain.com/api/cron/grant-subscription-tokens \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Add `CRON_SECRET` to your GitHub repository secrets.

### Option 4: Vercel Cron Jobs (Vercel Pro Plan)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/grant-subscription-tokens",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

Update the cron endpoint to check for Vercel's internal auth header instead of Bearer token.

---

## 💻 How It Works

### Immediate Grant on Subscription Purchase

When a user purchases a premium plan:

1. Payment webhook receives confirmation
2. User's premium status is activated
3. **100 tokens are immediately granted** (first month)
4. Token grant is recorded in database with current month

### Monthly Grant via Cron Job

On the 1st of each month:

1. External cron service calls your endpoint
2. API verifies the secret key
3. Database function finds all active premium users
4. Grants 100 tokens to each user (skips if already granted this month)
5. Records all transactions
6. Returns summary of grants

---

## 🧪 Testing

### Test the Cron Endpoint

```bash
# Replace with your actual values
curl -X POST https://your-domain.com/api/cron/grant-subscription-tokens \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Monthly token grant completed",
  "summary": {
    "total_processed": 5,
    "successful_grants": 5,
    "failed_grants": 0,
    "tokens_per_user": 100,
    "total_tokens_granted": 500
  },
  "timestamp": "2025-01-12T00:00:00.000Z",
  "grants": [
    {
      "user_id": "...",
      "tokens_granted": 100,
      "subscription_status": "active",
      "message": "Successfully granted 100 tokens"
    }
  ]
}
```

### Test Immediate Grant (Purchase Flow)

1. Go to `/premium` page
2. Purchase a subscription (use test mode if available)
3. Check your token balance - should have 100 tokens
4. Verify in database:

```sql
SELECT * FROM subscription_token_grants 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC;
```

### Verify No Duplicate Grants

Try calling the cron endpoint twice in the same month:

- First call: Grants tokens successfully
- Second call: Returns success but grants 0 tokens (already granted this month)

---

## 📊 Monitoring & Queries

### Check All Token Grants This Month

```sql
SELECT 
  stg.user_id,
  au.email,
  stg.tokens_granted,
  stg.plan_name,
  stg.created_at,
  ut.balance as current_balance
FROM subscription_token_grants stg
JOIN auth.users au ON stg.user_id = au.id
LEFT JOIN user_tokens ut ON stg.user_id = ut.user_id
WHERE stg.grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
ORDER BY stg.created_at DESC;
```

### Check Active Premium Users Without Tokens This Month

```sql
SELECT 
  pt.user_id,
  au.email,
  pt.plan_name,
  (pt.created_at + INTERVAL '1 month' * pt.plan_duration) as expires_at
FROM payment_transactions pt
JOIN auth.users au ON pt.user_id = au.id
WHERE pt.status = 'completed'
  AND pt.plan_id IS NOT NULL
  AND (pt.created_at + INTERVAL '1 month' * pt.plan_duration) > NOW()
  AND NOT EXISTS (
    SELECT 1 FROM subscription_token_grants stg
    WHERE stg.user_id = pt.user_id 
      AND stg.grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
  );
```

### Check User's Token Status

```sql
SELECT * FROM check_subscription_token_status('user-id-here');
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

---

## 🔒 Security

- ✅ Cron endpoint is protected by `CRON_SECRET` environment variable
- ✅ Only authenticated requests can trigger token grants
- ✅ Database functions use `SECURITY DEFINER` with proper RLS policies
- ✅ Unique constraint prevents duplicate grants per month
- ✅ All operations are logged in the database

---

## 🐛 Troubleshooting

### Tokens Not Granted on Purchase

**Check webhook logs:**
```bash
# Look for "Granted X tokens to user..." message
# Check for errors in webhook processing
```

**Verify database function exists:**
```sql
SELECT * FROM pg_proc WHERE proname = 'grant_tokens_to_subscriber';
```

**Manually grant tokens:**
```sql
SELECT * FROM grant_tokens_to_subscriber('user-id-here');
```

### Cron Job Not Working

**Test endpoint manually:**
```bash
curl -X POST https://your-domain.com/api/cron/grant-subscription-tokens \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -v
```

**Common issues:**
- ❌ Wrong `CRON_SECRET` - Check environment variables
- ❌ Missing `Bearer` prefix in Authorization header
- ❌ Wrong URL or endpoint path
- ❌ Firewall blocking the cron service

**Check cron service logs** in your chosen provider's dashboard.

### Duplicate Grant Error

This is **expected behavior** - tokens can only be granted once per month:

```json
{
  "success": false,
  "tokens_granted": 0,
  "message": "Tokens already granted for this month"
}
```

To manually re-grant for testing:
```sql
DELETE FROM subscription_token_grants 
WHERE user_id = 'user-id' 
  AND grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE;
```

---

## 📝 Manual Operations

### Grant Tokens to All Active Users (Manual Run)

```sql
SELECT * FROM grant_monthly_tokens_to_subscribers();
```

### Grant Tokens to Specific User

```sql
SELECT * FROM grant_tokens_to_subscriber('user-id-here');
```

### Check if User Already Received Tokens This Month

```sql
SELECT EXISTS (
  SELECT 1 FROM subscription_token_grants
  WHERE user_id = 'user-id-here'
    AND grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
) as already_granted;
```

---

## 🎯 Best Practices

1. **Test First:** Set up in a test/staging environment before production
2. **Monitor Regularly:** Check the first few monthly runs to ensure everything works
3. **Set Alerts:** Configure your cron service to alert you if the job fails
4. **Backup Schedule:** Set up a backup cron job on a different service
5. **Log Review:** Regularly review logs for any errors or issues
6. **User Communication:** Inform users about their monthly token rewards

---

## 📈 Statistics

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

### Total Tokens Granted (All Time)

```sql
SELECT 
  COUNT(*) as total_grant_events,
  SUM(tokens_granted) as total_tokens_distributed,
  COUNT(DISTINCT user_id) as unique_users_rewarded
FROM subscription_token_grants;
```

---

## 🚨 Important Notes

- Tokens are granted on the **1st of each month** at the time your cron job runs
- Users who purchase subscriptions mid-month still get **immediate 100 tokens**
- The monthly cron job will continue granting tokens for **subsequent months**
- If a subscription expires, the user **stops receiving monthly tokens**
- Database constraints prevent **duplicate grants** in the same month
- Failed grants are **logged but don't stop** the process for other users

---

## ✅ Checklist

- [ ] Database migration completed
- [ ] `CRON_SECRET` environment variable set
- [ ] Application deployed to production
- [ ] External cron job created and scheduled
- [ ] Cron job tested successfully
- [ ] Monitoring queries saved
- [ ] First manual test completed
- [ ] Team notified about the new system
- [ ] Users informed about monthly rewards

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review Supabase logs for database errors
3. Check your cron service dashboard for execution logs
4. Test the endpoint manually with curl
5. Verify environment variables are set correctly

---

**🎉 You're all set! Premium users will now receive 100 tokens immediately on purchase and 100 tokens every month automatically!**
