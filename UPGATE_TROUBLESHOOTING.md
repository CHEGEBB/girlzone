# Upgate Integration - Troubleshooting Guide 🔧

## Common Errors and Solutions

### Error: "Unexpected end of JSON input"

**Cause:** This error occurs when:
1. Upgate API key is not configured
2. Upgate API is not responding
3. Database table doesn't exist yet

**Solutions:**

#### Step 1: Ensure Database Table Exists
Run this SQL command in your Supabase SQL Editor:

```sql
-- Copy and paste the entire content of:
sql/create_upgate_sessions_table.sql
```

#### Step 2: Configure Upgate API Key
1. Go to Admin Settings → Payments tab
2. Enter your Upgate API key in the "Upgate Integration" section
3. Select Test or Live mode
4. Click "Save Upgate Settings"

#### Step 3: Keep Stripe as Default (Until Upgate is Ready)
1. In the "Payment Gateway" section at the top
2. Make sure **Stripe** is selected (purple highlight)
3. Click "Save Gateway Selection"

**This ensures your existing payment flow continues to work while you set up Upgate.**

---

### Error: "POST /api/admin/test-upgate-connection 400 (Bad Request)"

**Cause:** Upgate API key is not configured or is invalid.

**Solution:**
1. Get your Upgate API key from the Upgate dashboard
2. In Admin Settings → Payments
3. Paste the API key in the "API Key" field
4. Click "Save Upgate Settings"
5. Try "Test Connection" again

---

### Error: "Failed to create checkout session"

**Cause:** Either:
- Payment gateway is set to Upgate but it's not configured
- Database table doesn't exist
- API key is invalid

**Solution:**

**Quick Fix:** Switch back to Stripe temporarily:
1. Admin Settings → Payments tab
2. Click on the **Stripe** card (left side)
3. Click "Save Gateway Selection"
4. Your payments will work immediately

**Long-term Fix:** Complete Upgate setup:
1. Run database migration (Step 1 above)
2. Configure API key (Step 2 above)
3. Test connection successfully
4. Then switch to Upgate

---

## Setup Checklist

Before using Upgate, complete these steps IN ORDER:

### ✅ Step 1: Database Setup
```sql
-- Run in Supabase SQL Editor
-- File: sql/create_upgate_sessions_table.sql
CREATE TABLE IF NOT EXISTS upgate_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE,
  merchant_payment_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending',
  transaction_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_upgate_sessions_merchant_payment_id ON upgate_sessions(merchant_payment_id);
CREATE INDEX IF NOT EXISTS idx_upgate_sessions_user_id ON upgate_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upgate_sessions_status ON upgate_sessions(status);

-- Enable RLS
ALTER TABLE upgate_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own upgate sessions"
  ON upgate_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all upgate sessions"
  ON upgate_sessions FOR ALL
  USING (auth.role() = 'service_role');
```

### ✅ Step 2: Environment Variables
Add to `.env.local`:
```env
UPGATE_KEY=your_actual_upgate_api_key_here
UPGATE_STATUS=test  # Use 'live' for production
```

### ✅ Step 3: Admin Configuration
1. Navigate to Admin Settings
2. Go to Payments tab
3. Scroll to "Upgate Integration" section
4. Enter API Key
5. Select Mode (Test/Live)
6. Click "Save Upgate Settings"

### ✅ Step 4: Test Connection
1. Click "Test Connection" button
2. Should show: "Successfully connected to Upgate (test mode)"
3. If it fails, check your API key

### ✅ Step 5: Switch Payment Gateway
**Only do this after Steps 1-4 are complete!**
1. In "Payment Gateway" section
2. Click on **Upgate** card
3. Click "Save Gateway Selection"

---

## Current Status Check

Run this query in Supabase to verify setup:

```sql
-- Check if admin settings exist
SELECT key, value 
FROM admin_settings 
WHERE key IN ('payment_gateway', 'upgate_key', 'upgate_status');

-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'upgate_sessions';
```

**Expected Results:**
- `payment_gateway`: Either 'stripe' or 'upgate'
- `upgate_key`: Your API key (or NULL if not set)
- `upgate_status`: 'test' or 'live'
- `upgate_sessions` table should exist

---

## Recommended Approach

### For Immediate Use:
1. **Keep Stripe as the active gateway** (it's working perfectly)
2. Set up Upgate in the background
3. Test thoroughly in test mode
4. Switch to Upgate when ready

### To Set Up Upgate:
1. ✅ Run database migration
2. ✅ Get Upgate API credentials
3. ✅ Configure in Admin Settings
4. ✅ Test connection
5. ✅ Do a test purchase in test mode
6. ✅ Switch to live mode
7. ✅ Switch payment gateway

---

## FAQ

**Q: Will switching to Upgate break existing Stripe payments?**  
A: No! All existing Stripe payment records remain valid. Users can still access their purchased content.

**Q: Can I switch back to Stripe anytime?**  
A: Yes! Just go to Admin Settings → Payments and select Stripe, then save.

**Q: What if I don't have an Upgate account yet?**  
A: Keep using Stripe! The Upgate integration is optional. Your platform works perfectly with Stripe alone.

**Q: Do I need to configure webhooks?**  
A: Yes, but only after everything else is working. Configure webhook URL in Upgate dashboard:
```
https://your-domain.com/api/webhooks/upgate
```

**Q: What currency does Upgate use?**  
A: Upgate uses EUR (Euros). Make sure your pricing is appropriate for European markets.

---

## Support

If you continue to have issues:

1. **Check Server Logs:**
   - Look for detailed error messages in your server console
   - Check Network tab in browser DevTools

2. **Verify Configuration:**
   - Ensure API key is correct
   - Confirm database table exists
   - Check payment gateway setting

3. **Test with Stripe:**
   - Switch back to Stripe to confirm basic functionality works
   - This isolates the issue to Upgate configuration

4. **Contact Support:**
   - Check Upgate dashboard for API status
   - Review API documentation for any changes
   - Verify your Upgate account is active

---

## Success Indicators

✅ Database table created  
✅ API key configured  
✅ Test connection succeeds  
✅ Can make test purchases  
✅ Webhooks are being received  
✅ Payments are being processed  

Once all checkmarks are complete, Upgate is ready for production use!

---

**Last Updated:** January 2025  
**For:** Upgate Payment Gateway Integration
