# 🔧 Fix: Function Does Not Exist Error

## ❌ Error You're Seeing

```
ERROR: function grant_monthly_tokens_to_subscribers() does not exist
```

## ✅ Solution

You need to run the **main migration file first** to create all the functions.

---

## 📝 Step-by-Step Instructions

### **Step 1: Locate the Main Migration File**

File path:
```
girlzone-main/supabase/migrations/20250122_subscription_monthly_tokens.sql
```

### **Step 2: Open Supabase SQL Editor**

1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### **Step 3: Copy the Entire Migration File**

Open the file `20250122_subscription_monthly_tokens.sql` and copy **ALL** of its contents (405 lines).

### **Step 4: Paste and Run**

1. Paste the entire contents into the SQL Editor
2. Click the **Run** button (or press Ctrl+Enter)
3. Wait for completion (should take 2-5 seconds)

### **Step 5: Verify Success**

You should see output like:
```
Success. No rows returned
```

### **Step 6: Test the Functions**

Now run the test file to verify everything was created:

Copy and run `TEST_MIGRATION.sql`

All tests should return `true`.

### **Step 7: Now You Can Grant Tokens!**

Run this command:
```sql
SELECT * FROM grant_monthly_tokens_to_subscribers();
```

---

## 🎯 Quick Copy-Paste (for the impatient)

If you just want to get it working NOW:

1. **Open:** `supabase/migrations/20250122_subscription_monthly_tokens.sql`
2. **Select All** (Ctrl+A)
3. **Copy** (Ctrl+C)
4. **Go to Supabase SQL Editor**
5. **Paste** (Ctrl+V)
6. **Click RUN**
7. **Done!** ✅

Now the functions will exist and you can run:
```sql
SELECT * FROM grant_monthly_tokens_to_subscribers();
```

---

## 🔍 Troubleshooting

### Error: "relation subscription_plans does not exist"

If you get this error, it means the `subscription_plans` table doesn't exist yet. Run:
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'subscription_plans'
);
```

If it returns `false`, you need to run the subscription plans migration first:
```
supabase/migrations/20240322_create_subscription_plans.sql
```

### Error: "permission denied"

Make sure you're running the SQL as an admin user in Supabase.

### Still Not Working?

Run the diagnostic query:
```sql
-- Check what functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%token%'
ORDER BY routine_name;
```

This will show all token-related functions in your database.

---

## ✅ Success Indicators

After running the migration, these should all exist:

- ✅ Table: `subscription_token_grants`
- ✅ Function: `grant_monthly_tokens_to_subscribers()`
- ✅ Function: `grant_tokens_to_subscriber(user_id)`
- ✅ Function: `check_subscription_token_status(user_id)`
- ✅ View: `current_month_token_grants` (if you ran automation file)
- ✅ View: `pending_token_grants` (if you ran automation file)

---

## 📞 Next Steps

Once the migration is successful:

1. **Grant tokens:** `SELECT * FROM grant_monthly_tokens_to_subscribers();`
2. **Check results:** See `MANUAL_EXECUTION_COMMANDS.sql` for monitoring queries
3. **Set up automation:** Run `20250122_subscription_tokens_automation.sql` (optional)

---

## 🎉 You Got This!

Just run that one migration file and everything will work! 🚀

