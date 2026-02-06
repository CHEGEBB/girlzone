# 🔍 Debug Premium Status Issue

## Changes Made

### 1. Fixed Loading State Issue
**Problem:** While premium status was loading (`isCheckingPremium = true`), the `isPremium` was `false`, causing all options to appear disabled initially.

**Fix:** Updated the `isDisabled` logic:
```typescript
// OLD:
const isDisabled = !isPremium && option.value !== "1"

// NEW: Don't disable while checking
const isDisabled = !isCheckingPremium && !isPremium && option.value !== "1"
```

### 2. Added Console Logging
Added detailed console logs to debug the premium check:
- "Checking premium status for user: {userId}"
- "Premium status response: {data}"
- "User is premium: {true/false}"

### 3. Added Visual Premium Badge
For premium users, a "👑 Premium" badge now appears next to the title to confirm premium status is detected.

---

## 🧪 How to Debug

### Step 1: Open Browser Console
1. Go to `/generate` page
2. Open DevTools (F12)
3. Go to Console tab

### Step 2: Check Console Logs
Look for these messages:
```
Checking premium status for user: <your-user-id>
Premium status response: { success: true, isPremium: true, ... }
User is premium: true
```

### Step 3: Check Premium Badge
- If you're premium, you should see "👑 Premium" badge next to "Generate Image" title
- If you don't see it, premium status is not being detected

---

## 🔍 Troubleshooting

### Issue 1: Premium Status API Returns False
**Check:**
```sql
-- Check if you have an active subscription
SELECT 
  pt.user_id,
  pt.plan_name,
  pt.created_at,
  (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) as expires_at,
  CASE 
    WHEN (pt.created_at + INTERVAL '1 month' * COALESCE(pt.plan_duration, 1)) > NOW() 
    THEN 'Active' 
    ELSE 'Expired' 
  END as status
FROM payment_transactions pt
WHERE pt.user_id = 'YOUR_USER_ID'
  AND pt.status = 'completed'
  AND pt.plan_id IS NOT NULL
ORDER BY pt.created_at DESC;
```

**If no results:** You don't have a completed subscription payment.

**If expired:** Your subscription has ended.

**Solution:** Subscribe via `/premium?tab=subscriptions`

---

### Issue 2: User ID Not Found
**Symptom:** Console shows "No user ID, setting as free user"

**Check:**
1. Are you logged in?
2. Check `user` context in DevTools:
   ```javascript
   // In console
   console.log(window.localStorage)
   ```

**Solution:** Log out and log back in.

---

### Issue 3: API Error
**Symptom:** Console shows "Premium status check failed: 401" or "Failed to check premium status"

**Check:**
1. Open Network tab in DevTools
2. Look for `/api/user-premium-status` request
3. Check response

**Common issues:**
- 401 Unauthorized: User not authenticated
- 500 Server Error: Backend issue

**Solution:** Check the API endpoint and Supabase connection.

---

### Issue 4: Payment Completed but Not Showing Premium
**Check the subscription_token_grants table:**
```sql
-- See if you've been granted monthly tokens
SELECT * FROM subscription_token_grants 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

**If no results:** Run the token grant function:
```sql
SELECT * FROM grant_tokens_to_subscriber('YOUR_USER_ID');
```

---

## 🎯 Expected Behavior

### Premium User:
✅ Console: "User is premium: true"  
✅ UI: "👑 Premium" badge visible  
✅ UI: All 4 image options (1, 4, 6, 8) are clickable  
✅ UI: No "Premium" badges on options  
✅ UI: No "Want to generate multiple images?" prompt  

### Free User:
✅ Console: "User is premium: false"  
✅ UI: No premium badge  
✅ UI: Only "1" option clickable  
✅ UI: "Premium" badges on 4, 6, 8 options  
✅ UI: "🆓 Free: 1 image only" text visible  
✅ UI: Upgrade prompt below options  

---

## 🚀 Quick Fix Commands

### Force Set Premium Status (Temporary Test):
Open Console and run:
```javascript
// This will only work until page refresh
localStorage.setItem('test-premium', 'true')
location.reload()
```

### Check Your User ID:
```javascript
// In console on any page
const auth = await (await fetch('/api/user')).json()
console.log('Your User ID:', auth.user?.id)
```

### Manual Premium Check:
```javascript
// Check premium status manually
const userId = 'YOUR_USER_ID'
const response = await fetch(`/api/user-premium-status?userId=${userId}`)
const data = await response.json()
console.log('Premium Status:', data)
```

---

## 📞 Next Steps

1. **Open the page** → Check console logs
2. **See the badge?** → Premium is working ✅
3. **No badge?** → Check the troubleshooting steps above
4. **Still not working?** → Share the console logs

---

## ✅ Verification Checklist

After subscribing, verify:
- [ ] Payment appears in `payment_transactions` table
- [ ] `status = 'completed'`
- [ ] `plan_id` is not null
- [ ] Expiration date is in the future
- [ ] Premium status API returns `isPremium: true`
- [ ] Premium badge appears on generate page
- [ ] All 4 image options are enabled
- [ ] No upgrade prompts visible

