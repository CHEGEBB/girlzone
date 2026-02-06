# Message Counter Implementation Summary

## Overview
This document describes the implementation of a message counter system that deducts 1 token for every 4 messages sent by users to any AI model.

## Changes Made

### 1. Database Schema Changes

#### File: `supabase/migrations/20250125_add_message_counter.sql`
- Added `message_count` column to the `user_tokens` table
- Column tracks the cumulative number of messages sent by each user
- Default value is 0
- Column is of type INTEGER and cannot be NULL

**Migration SQL:**
```sql
ALTER TABLE user_tokens 
ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0;
```

### 2. Token Deduction Logic Updates

#### File: `app/api/deduct-token/route.ts`
Updated the token deduction endpoint to implement the new logic:

**Key Changes:**
1. **Message Counter Tracking**: Each API call increments the user's message count
2. **Token Deduction Logic**: Deducts 1 token every 4 messages (when `message_count % 4 === 0`)
3. **Response Information**: Returns detailed information about message count and token deduction status

**API Response Structure:**

When a token is deducted (every 4th message):
```json
{
  "success": true,
  "message": "1 token deducted (4 messages sent)",
  "newBalance": 99,
  "messageCount": 4,
  "tokenDeducted": true
}
```

When no token is deducted (messages 1-3):
```json
{
  "success": true,
  "message": "Message sent (3 of 4 messages)",
  "newBalance": 100,
  "messageCount": 3,
  "tokenDeducted": false,
  "messagesUntilDeduction": 1
}
```

When insufficient tokens:
```json
{
  "error": "Insufficient tokens",
  "insufficientTokens": true,
  "currentBalance": 0,
  "requiredTokens": 1,
  "messagesSent": 4
}
```

## How It Works

### Message Flow

1. **User sends a message** to any AI model/character
2. **Frontend calls** `/api/deduct-token` endpoint with `userId`
3. **Backend logic:**
   - Fetches current `balance` and `message_count` from `user_tokens` table
   - Increments `message_count` by 1
   - Checks if `message_count % 4 === 0`:
     - **YES**: Deducts 1 token if available, records transaction
     - **NO**: Only updates message count, no token deduction
4. **Response** sent back to frontend with deduction status
5. **Frontend** proceeds with sending message if successful

### Example Scenario

**User starts with 10 tokens:**

| Message # | Message Count | Token Deducted? | Remaining Tokens | Notes |
|-----------|---------------|-----------------|------------------|-------|
| 1         | 1             | No              | 10               | 3 messages until deduction |
| 2         | 2             | No              | 10               | 2 messages until deduction |
| 3         | 3             | No              | 10               | 1 message until deduction |
| 4         | 4             | **Yes**         | **9**            | Token deducted! |
| 5         | 5             | No              | 9                | 3 messages until deduction |
| 6         | 6             | No              | 9                | 2 messages until deduction |
| 7         | 7             | No              | 9                | 1 message until deduction |
| 8         | 8             | **Yes**         | **8**            | Token deducted! |

### Cross-Model Tracking

The message counter is **global per user**, meaning:
- Messages to Model A count toward the total
- Messages to Model B count toward the total
- Messages to Model C count toward the total
- All messages across all models are tracked together

**Example:**
- User says "Hi" to Model A (message count: 1)
- User says "Hello" to Model B (message count: 2)
- User says "Hey" to Model C (message count: 3)
- User says "Yo" to Model A again (message count: 4) → **1 token deducted**

## Transaction Recording

When a token is deducted, a transaction record is created in the `token_transactions` table:

```json
{
  "user_id": "uuid",
  "amount": -1,
  "type": "usage",
  "description": "Chat message (4 messages sent, 1 token deducted)",
  "created_at": "2025-01-25T02:08:00Z"
}
```

## Installation Instructions

### Step 1: Run Database Migration

Execute the migration to add the `message_count` column:

```bash
# If using Supabase CLI
supabase migration up

# Or apply manually via SQL editor in Supabase Dashboard
```

**SQL to run manually:**
```sql
ALTER TABLE user_tokens 
ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN user_tokens.message_count IS 'Tracks the number of messages sent by the user. 1 token is deducted every 4 messages.';
```

### Step 2: Verify Migration

Check that the column was added successfully:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_tokens' AND column_name = 'message_count';
```

Expected result:
```
column_name   | data_type | is_nullable | column_default
message_count | integer   | NO          | 0
```

### Step 3: Deploy Updated API

The updated `app/api/deduct-token/route.ts` file is already in place and will automatically use the new logic.

### Step 4: Test the Implementation

1. Send messages to any AI character
2. Check the API response for message count information
3. Verify that tokens are deducted every 4 messages
4. Check `user_tokens` table to see `message_count` incrementing
5. Check `token_transactions` table for deduction records

## Testing Queries

### Check User's Current Message Count and Balance
```sql
SELECT user_id, balance, message_count, updated_at
FROM user_tokens
WHERE user_id = 'your-user-id-here';
```

### View Recent Token Transactions
```sql
SELECT user_id, amount, type, description, created_at
FROM token_transactions
WHERE user_id = 'your-user-id-here'
ORDER BY created_at DESC
LIMIT 10;
```

### Reset Message Count for Testing (if needed)
```sql
UPDATE user_tokens
SET message_count = 0
WHERE user_id = 'your-user-id-here';
```

## Backward Compatibility

- **Existing users**: Will start with `message_count = 0` and begin tracking from their next message
- **No data loss**: All existing token balances remain unchanged
- **Gradual rollout**: The system starts tracking immediately upon deployment

## Benefits

1. **Fair Usage**: Users get 4 messages per token instead of 1 message per token
2. **Better UX**: Users can have multi-turn conversations without worrying about every single message
3. **Transparent Tracking**: Users receive feedback about their message count and upcoming deductions
4. **Accurate Analytics**: Admins can track exact message volumes per user

## Future Enhancements

Potential improvements that could be added:
- Display message counter in the UI (e.g., "3/4 messages used")
- Allow admins to configure the message-to-token ratio
- Add option to reset message counts monthly for premium users
- Implement different ratios for different subscription tiers
