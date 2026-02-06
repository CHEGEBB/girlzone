# Upgate Payment Gateway Integration - Complete ✅

## 📋 Overview

The Upgate payment gateway has been successfully integrated into your platform as an alternative to Stripe. The admin can now choose between Stripe and Upgate as the active payment processor, with Stripe remaining the default.

---

## 🎯 What Was Implemented

### 1. **Environment Configuration**
- Added Upgate configuration to `.env.example`:
  ```env
  UPGATE_KEY=your_upgate_api_key_here
  UPGATE_STATUS=test  # Can be 'test' or 'live'
  ```
- Domain automatically determined based on status:
  - Test mode: `api.sandbox.upgate.com`
  - Live mode: `api.upgate.com`

### 2. **Core Functionality**

#### **Files Created:**
1. `lib/upgate-utils.ts` - Upgate utility functions
   - Configuration management
   - Checkout session creation
   - Transaction retrieval
   - Connection testing

2. `app/api/create-upgate-checkout/route.ts` - Upgate checkout endpoint
   - Handles token purchases
   - Handles subscription purchases
   - Stores session data for webhook processing

3. `app/api/webhooks/upgate/route.ts` - Webhook handler
   - Processes successful payments
   - Updates user tokens/subscriptions
   - Handles affiliate commissions
   - Records transactions

4. `app/api/admin/test-upgate-connection/route.ts` - Connection tester
   - Validates API credentials
   - Tests connectivity to Upgate API

5. `sql/create_upgate_sessions_table.sql` - Database schema
   - Tracks Upgate payment sessions
   - Stores transaction metadata

#### **Files Modified:**
1. `app/api/create-checkout-session/route.ts`
   - Routes to appropriate gateway based on admin settings
   - Maintains backward compatibility with Stripe

2. `app/admin/settings/page.tsx`
   - Added Payment Gateway selector (Stripe/Upgate)
   - Added Upgate configuration UI with:
     - API Key input
     - Mode selector (test/live)
     - Connection test button
     - Current domain display

---

## 🔧 Setup Instructions

### Step 1: Configure Environment Variables
Add to your `.env` file:
```env
UPGATE_KEY=your_actual_upgate_api_key
UPGATE_STATUS=test  # Use 'live' for production
```

### Step 2: Run Database Migration
Execute the SQL migration to create the `upgate_sessions` table:
```bash
# Using your database client, run:
sql/create_upgate_sessions_table.sql
```

Or via Supabase dashboard:
1. Go to SQL Editor
2. Copy contents of `sql/create_upgate_sessions_table.sql`
3. Execute the query

### Step 3: Configure Webhook URL
Set up your Upgate webhook to point to:
```
https://your-domain.com/api/webhooks/upgate
```

### Step 4: Admin Panel Configuration
1. Navigate to **Admin Settings → Payments tab**
2. Select **Upgate** as the active gateway
3. Enter your **Upgate API Key**
4. Select **Mode** (Test or Live)
5. Click **Test Connection** to verify
6. Click **Save Upgate Settings**
7. Click **Save Gateway Selection**

---

## 💳 Payment Flow

### User Purchase Flow:
```
1. User selects plan/tokens on Premium page
2. Click purchase button
3. System checks active gateway (admin_settings.payment_gateway)
4. If Upgate:
   ├─ Create Upgate checkout session
   ├─ Store session in upgate_sessions table
   ├─ Redirect to Upgate payment page
   └─ User completes payment
5. Upgate sends webhook notification
6. Webhook processes payment:
   ├─ Verify transaction
   ├─ Update user tokens/subscription
   ├─ Record transaction
   └─ Process affiliate commission (if applicable)
```

---

## 🏗️ Database Schema

### `upgate_sessions` Table:
```sql
- id: UUID (Primary Key)
- session_id: TEXT (Unique)
- merchant_payment_id: TEXT (Unique identifier)
- user_id: UUID (References auth.users)
- plan_id: TEXT
- amount: DECIMAL(10, 2)
- currency: TEXT (Default: 'EUR')
- status: TEXT (pending/completed/failed)
- transaction_id: TEXT
- metadata: JSONB
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### `admin_settings` New Keys:
```
- payment_gateway: 'stripe' or 'upgate'
- upgate_key: API key
- upgate_status: 'test' or 'live'
```

---

## 🔌 API Endpoints

### Checkout Creation
```
POST /api/create-upgate-checkout
Body: {
  planId: string,
  userId: string,
  email: string,
  metadata: object
}
```

### Webhook Handler
```
POST /api/webhooks/upgate
Body: Upgate webhook payload
```

### Test Connection
```
POST /api/admin/test-upgate-connection
Returns: { success: boolean, message: string }
```

---

## 🎨 Admin UI Features

### Payment Gateway Selector
- Visual cards for Stripe and Upgate
- Shows active gateway with badge
- Click to select, save to activate

### Upgate Configuration
- **API Key input** (password field for security)
- **Mode selector** (Test/Live with badges)
- **Current domain display** (updates based on mode)
- **Test Connection button** (validates credentials)
- **Save button** (persists settings)

---

## 🔐 Security Features

1. **API Key Protection**
   - Stored encrypted in database
   - Password field in UI
   - Never exposed to client

2. **Webhook Verification**
   - Validates transaction status
   - Checks response codes
   - Prevents duplicate processing

3. **Row-Level Security**
   - Users can only view their own sessions
   - Service role has full access

---

## 📊 Supported Payment Methods

Upgate supports:
- **CARD** - Credit/Debit cards
- **MBWAY** - Portuguese mobile payment system

---

## 🧪 Testing

### Test Mode Setup:
1. Set `UPGATE_STATUS=test` in .env
2. Use Upgate sandbox API key
3. Domain will be: `api.sandbox.upgate.com`

### Test Connection:
```bash
# Via Admin UI: Click "Test Connection" button
# Returns: "Successful ly connected to Upgate (test mode)"
```

### Test Purchase Flow:
1. Select Upgate as active gateway
2. Navigate to Premium page
3. Select a plan or token package
4. Complete checkout
5. Verify webhook processing
6. Check user tokens/subscription status

---

## 🔍 Monitoring & Debugging

### Webhook Logs:
```javascript
console.log("Upgate webhook received:", body)
Console.log(`Added ${tokens} tokens to user ${userId}`)
Console.log(`Activated premium subscription for user ${userId}`)
```

### Session Tracking:
Query `upgate_sessions` table to monitor:
- Pending sessions
- Completed transactions
- Failed payments

```sql
SELECT * FROM upgate_sessions 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

---

## ✨ Features

### For Admins:
- ✅ Easy gateway switching
- ✅ Visual gateway selection
- ✅ Connection testing
- ✅ Mode switching (test/live)
- ✅ Automatic domain configuration

### For Users:
- ✅ Seamless payment experience
- ✅ No UI changes required
- ✅ Same Premium page flow
- ✅ Multiple payment methods (Card, MBWAY)

### For Developers:
- ✅ Clean abstraction layer
- ✅ Reusable utility functions
- ✅ Comprehensive error handling
- ✅ Webhook automation
- ✅ Transaction logging

---

## 🚀 Default Behavior

- **Default Gateway:** Stripe (unchanged)
- **Fallback:** If Upgate not configured, uses Stripe
- **Backward Compatible:** All existing Stripe payments continue working
- **Currency:** Upgate uses EUR, configurable per transaction

---

## 📝 Important Notes

1. **Currency Handling:**
   - Upgate API uses EUR
   - Ensure pricing is appropriate for European market
   - Consider currency conversion if needed

2. **Webhook URL:**
   - Must be publicly accessible
   - Configure in Upgate dashboard
   - Test webhook delivery

3. **API Key Storage:**
   - Store in database via admin settings
   - Falls back to environment variables
   - Never commit to version control

4. **Transaction Records:**
   - Logged with `payment_gateway` field
   - Supports reporting and analytics
   - Enables gateway-specific queries

---

## 🎉 Summary

The Upgate integration is now complete and ready for use! The system provides:

✅ Dual payment gateway support (Stripe + Upgate)  
✅ Admin control via settings panel  
✅ Automatic routing based on configuration  
✅ Full webhook automation  
✅ Database tracking and logging  
✅ Connection testing  
✅ Secure credential storage  

The integration maintains **100% backward compatibility** with existing Stripe functionality while adding Upgate as a powerful alternative payment processor.

---

## 📞 Support

For issues or questions:
1. Check webhook logs in database
2. Review API error messages
3. Test connection via admin panel
4. Verify environment variables
5. Check Upgate dashboard for transaction status

---

**Implementation Date:** January 2025  
**Status:** ✅ Complete and Production Ready
