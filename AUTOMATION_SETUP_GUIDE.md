# 🔄 Subscription Token Grants - Automation Setup Guide

This guide explains how to set up automatic monthly token grants for subscribers using external cron services.

## 📋 Prerequisites

- ✅ Database migration has been run
- ✅ API endpoint is deployed: `/api/grant-subscription-tokens`
- ✅ `CRON_SECRET` environment variable is set (for security)

## 🤖 Automation Options

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/monthly-token-grants.yml`:

```yaml
name: Monthly Token Grants

on:
  schedule:
    # Run on the 1st of every month at 00:00 UTC
    - cron: '0 0 1 * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  grant-tokens:
    runs-on: ubuntu-latest
    steps:
      - name: Grant Monthly Tokens
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            ${{ secrets.APP_URL }}/api/grant-subscription-tokens
```

**Setup Steps:**
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add `CRON_SECRET` (same value as your `CRON_SECRET` env var)
3. Add `APP_URL` (your production URL, e.g., `https://yourapp.com`)
4. Create the workflow file above
5. Test by manually triggering the workflow

### Option 2: Vercel Cron Jobs

If using Vercel, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/grant-subscription-tokens",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

**Setup Steps:**
1. Add the cron configuration to `vercel.json`
2. Deploy to Vercel
3. The cron will run automatically on the 1st of each month

### Option 3: External Cron Services

#### Using cron-job.org (Free)
1. Go to [cron-job.org](https://cron-job.org)
2. Create a new cron job
3. Set schedule: `0 0 1 * *` (1st of every month)
4. URL: `https://yourapp.com/api/grant-subscription-tokens`
5. Method: `POST`
6. Headers:
   ```
   Authorization: Bearer YOUR_CRON_SECRET
   Content-Type: application/json
   ```

#### Using EasyCron
1. Go to [easycron.com](https://www.easycron.com)
2. Create a new cron job
3. Set URL: `https://yourapp.com/api/grant-subscription-tokens`
4. Method: `POST`
5. Schedule: Monthly → 1st → 00:00
6. Headers: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 4: AWS EventBridge (Advanced)

For AWS deployments:

1. Create an EventBridge rule with schedule `cron(0 0 1 * ? *)`
2. Target: API Gateway or Lambda function that calls your endpoint
3. Add authorization headers

## 🔐 Security Setup

### 1. Set Environment Variable

Add to your `.env.local` (development) and production environment:

```bash
CRON_SECRET=your-secure-random-string-here
```

### 2. Generate Secure Secret

Use a secure random string (at least 32 characters):

```bash
# Linux/Mac
openssl rand -base64 32

# Or use online generator
```

## 📊 Monitoring

### Check Recent Grants

```sql
SELECT
  created_at,
  user_id,
  tokens_granted,
  plan_name
FROM subscription_token_grants
WHERE grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
ORDER BY created_at DESC;
```

### API Response Monitoring

The API returns:
```json
{
  "success": true,
  "grants": [...],
  "summary": {
    "total_processed": 25,
    "successful_grants": 25,
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

### Logs

Check your application logs for:
- "Monthly token grant completed: X/Y users granted tokens"
- Any error messages from the grant process

## 🧪 Testing

### Manual Test

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  https://yourapp.com/api/grant-subscription-tokens
```

### Check Status

```bash
curl https://yourapp.com/api/grant-subscription-tokens
```

Returns current month grant statistics.

## 🚨 Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check `CRON_SECRET` environment variable
   - Verify the secret matches between your app and cron service

2. **No grants processed**
   - Check if there are active subscribers
   - Verify subscription expiration dates
   - Check database connection

3. **Duplicate grants**
   - The system prevents duplicates automatically
   - Check if cron is running multiple times

### Debug Commands

```sql
-- Check active subscribers
SELECT * FROM pending_token_grants;

-- Check recent grants
SELECT * FROM subscription_token_grants
WHERE grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE;

-- Check subscription status for a user
SELECT * FROM check_subscription_token_status('user-uuid-here');
```

## 📅 Schedule Options

- **Monthly (1st)**: `0 0 1 * *` - Recommended
- **Monthly (15th)**: `0 0 15 * *` - Alternative
- **Weekly**: `0 0 * * 1` - For testing
- **Daily**: `0 0 * * *` - For testing only

## 🎯 Best Practices

1. **Monitor regularly** - Check logs and grant counts monthly
2. **Test before production** - Use staging environment first
3. **Secure secrets** - Never commit `CRON_SECRET` to code
4. **Backup data** - Regular database backups
5. **Alert on failures** - Set up notifications for failed grants

## 📞 Support

If automation fails:
1. Check application logs
2. Verify cron service configuration
3. Test API endpoint manually
4. Check database connectivity
5. Review subscription data

---

## ✅ Checklist

- [ ] Environment variable `CRON_SECRET` set
- [ ] API endpoint deployed and accessible
- [ ] Cron service configured with correct schedule
- [ ] Authorization header properly set
- [ ] Test run successful
- [ ] Monitoring in place
- [ ] Backup strategy implemented

Happy automating! 🤖
