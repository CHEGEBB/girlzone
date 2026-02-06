# 🚀 Quick Start: Subscription Token Grants

## ⚡ Step-by-Step Setup (5 Minutes)

### 1️⃣ Run the Migration

Open your **Supabase SQL Editor** and execute:

```
supabase/migrations/20250122_subscription_monthly_tokens.sql
```

✅ This creates all necessary tables and functions.

---

### 2️⃣ Grant Tokens to Active Subscribers

Copy and paste this into Supabase SQL Editor:

```sql
SELECT * FROM grant_monthly_tokens_to_subscribers();
```

✅ This grants 100 tokens to all users with active subscriptions.

---

### 3️⃣ Verify It Worked

Check who received tokens:

```sql
SELECT 
  au.email,
  stg.tokens_granted,
  stg.plan_name,
  stg.created_at as granted_at
FROM subscription_token_grants stg
JOIN auth.users au ON stg.user_id = au.id
WHERE stg.grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
ORDER BY stg.created_at DESC;
```

---

## 📋 Monthly Checklist

Run this at the **beginning of each month**:

```sql
SELECT * FROM grant_monthly_tokens_to_subscribers();
```

That's it! ✨

---

## 🔧 Common Tasks

### Grant Tokens to One User

```sql
SELECT * FROM grant_tokens_to_subscriber('USER_UUID_HERE');
```

### Check User's Subscription Status

```sql
SELECT * FROM check_subscription_token_status('USER_UUID_HERE');
```

### See Who Needs Tokens

```sql
SELECT * FROM pending_token_grants;
```

---

## 🤖 Automate (Optional)

For automatic monthly grants, run:

```
supabase/migrations/20250122_subscription_tokens_automation.sql
```

This uses pg_cron to run on the 1st of every month automatically.

*(Requires Supabase Pro or higher)*

---

## 📖 More Details

- **Full Documentation:** `SUBSCRIPTION_TOKENS_SETUP.md`
- **All Commands:** `MANUAL_EXECUTION_COMMANDS.sql`

---

## ✅ System Features

- ✨ **100 tokens/month** per active subscriber
- 🔒 **No duplicates** - can't grant twice in same month
- ⚡ **Automatic detection** - finds all active subscriptions
- 📊 **Full history** - tracks every grant
- 🛡️ **Safe** - continues even if one user fails
- 📈 **Monitoring** - built-in views and reports

---

## 💡 How It Works

1. **Checks** `payment_transactions` for active subscriptions
2. **Grants** 100 tokens to eligible users
3. **Records** grant in `subscription_token_grants`
4. **Updates** user balance in `user_tokens`
5. **Logs** transaction in `token_transactions`

---

## 🎯 Success!

You're all set! Your subscribers will now receive 100 tokens per month automatically.

Need help? Check the detailed docs in `SUBSCRIPTION_TOKENS_SETUP.md`
