# 🚀 START HERE: Subscription Token Setup

## ❌ The Error You're Seeing

```
ERROR: relation "payment_transactions" does not exist
```

This means the `payment_transactions` table hasn't been created yet.

---

## ✅ **ONE FILE TO RULE THEM ALL**

I've created a **complete setup file** that does everything in one go.

### **📁 File to Run:**
```
COMPLETE_SETUP.sql
```

### **What It Does:**
1. ✅ Creates `payment_transactions` table (if not exists)
2. ✅ Creates `subscription_token_grants` table
3. ✅ Updates `token_transactions` constraint
4. ✅ Creates all 3 functions you need
5. ✅ Handles all edge cases automatically

---

## 🎯 **Quick Steps (2 Minutes)**

### **Step 1: Open Supabase SQL Editor**
1. Go to your Supabase Dashboard
2. Click **SQL Editor** in sidebar
3. Click **New Query**

### **Step 2: Run the Complete Setup**
1. Open file: `COMPLETE_SETUP.sql`
2. Copy **ALL** contents (Ctrl+A, Ctrl+C)
3. Paste into SQL Editor (Ctrl+V)
4. Click **Run** (or Ctrl+Enter)
5. Wait 5-10 seconds

### **Step 3: Grant Tokens**
Now run:
```sql
SELECT * FROM grant_monthly_tokens_to_subscribers();
```

**Done!** 🎉

---

## 📋 **What Gets Created**

### Tables:
- ✅ `payment_transactions` - Stores all subscription purchases
- ✅ `subscription_token_grants` - Tracks monthly token grants

### Functions:
- ✅ `grant_monthly_tokens_to_subscribers()` - Grant to all active subscribers
- ✅ `grant_tokens_to_subscriber(user_id)` - Grant to specific user
- ✅ `check_subscription_token_status(user_id)` - Check status

---

## 🧪 **Test It Works**

After running the setup:

```sql
-- 1. Check tables exist
SELECT tablename 
FROM pg_tables 
WHERE tablename IN ('payment_transactions', 'subscription_token_grants');

-- 2. Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%subscription%';

-- 3. Try granting tokens
SELECT * FROM grant_monthly_tokens_to_subscribers();
```

---

## 💡 **If You Already Have payment_transactions Table**

No problem! The script uses `CREATE TABLE IF NOT EXISTS`, so it won't duplicate or break anything.

---

## 📊 **After Setup**

### Grant tokens monthly:
```sql
SELECT * FROM grant_monthly_tokens_to_subscribers();
```

### Check who got tokens:
```sql
SELECT 
  au.email,
  stg.tokens_granted,
  stg.plan_name,
  stg.created_at
FROM subscription_token_grants stg
JOIN auth.users au ON stg.user_id = au.id
WHERE stg.grant_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
ORDER BY stg.created_at DESC;
```

### Check a user's status:
```sql
SELECT * FROM check_subscription_token_status('user-uuid-here');
```

---

## 🆘 **Troubleshooting**

### Error: "relation subscription_plans does not exist"

You need to create the subscription plans table first. Run:
```
supabase/migrations/20240322_create_subscription_plans.sql
```

Then run `COMPLETE_SETUP.sql` again.

### Error: "permission denied"

Make sure you're logged in as an admin in Supabase.

### Still Having Issues?

1. Check Supabase logs for detailed errors
2. Run `CHECK_EXISTING_DATA.sql` to see what you have
3. Review `FIX_CONSTRAINT_ERROR.md` for detailed troubleshooting

---

## 📁 **Other Files (Optional)**

- `MANUAL_EXECUTION_COMMANDS.sql` - All commands reference
- `SUBSCRIPTION_TOKENS_SETUP.md` - Full documentation
- `QUICK_START_SUBSCRIPTION_TOKENS.md` - Quick guide
- `20250122_subscription_tokens_automation.sql` - Auto-scheduling

---

## ✅ **Success Checklist**

- [ ] Run `COMPLETE_SETUP.sql`
- [ ] See "Success" message (no errors)
- [ ] Run `SELECT * FROM grant_monthly_tokens_to_subscribers();`
- [ ] See list of users who got tokens
- [ ] Verify tokens in database
- [ ] Set up monthly reminder (or automation)

---

## 🎉 **You're Done!**

Your subscribers will now get **500 tokens per month** automatically!

Just remember to run this at the start of each month:
```sql
SELECT * FROM grant_monthly_tokens_to_subscribers();
```

---

## 📞 **Need Help?**

- Check the detailed docs in `SUBSCRIPTION_TOKENS_SETUP.md`
- Review error fixes in `FIX_CONSTRAINT_ERROR.md`
- Test queries in `MANUAL_EXECUTION_COMMANDS.sql`

**Happy granting!** 🚀

