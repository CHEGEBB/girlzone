# Token Earnings Implementation Summary

## Overview
This document describes the implementation of a token earnings system that tracks and displays earnings for model owners based on chat interactions. Model owners earn $0.0001 per token consumed when users chat with their models.

## Changes Made

### 1. Database Schema
The existing `model_usage_logs` and `model_creator_earnings` tables (from `supabase/migrations/20250115_create_usage_earnings_system.sql`) are used to track:

**model_usage_logs table:**
- Records every chat interaction with a model
- Tracks tokens consumed and earnings generated per chat
- Links user, model, and usage type (chat, image_generation, etc.)

**model_creator_earnings table:**
- Aggregates total earnings per model
- Tracks total tokens consumed, usage count, and total earnings
- Links to the model creator/owner

### 2. Token Deduction API Updates

#### File: `app/api/deduct-token/route.ts`
Enhanced to track model usage and credit model owners:

**Key Changes:**
1. **Character ID Parameter**: Now accepts `characterId` to identify which model was used
2. **Model Lookup**: Finds the model associated with the character
3. **Owner Verification**: Checks who owns the model via `user_models` table
4. **Earnings Calculation**: Calculates earnings at $0.0001 per token
5. **Usage Logging**: Records usage in `model_usage_logs` table
6. **Earnings Aggregation**: Updates or creates record in `model_creator_earnings` table

**Important Logic:**
- Only credits earnings if the user chatting is different from the model owner
- Prevents users from earning money by chatting with their own models
- Handles cases where no model is found gracefully (doesn't fail the chat)

**Example Flow:**
```
User A chats with Character X (owned by User B)
↓
1 token deducted from User A's balance
↓
Model associated with Character X found
↓
User B identified as model owner
↓
$0.0001 credited to User B's model earnings
↓
Usage logged and aggregated
```

### 3. Chat Page Updates

#### File: `app/chat/[id]/page.tsx`
Updated to pass character ID when deducting tokens:

**Changes:**
```javascript
// Before
body: JSON.stringify({ userId: user.id })

// After
body: JSON.stringify({ userId: user.id, characterId: characterId })
```

This ensures the backend knows which character/model is being used for proper earnings tracking.

### 4. Model Earnings API

#### File: `app/api/model-earnings/route.ts`
New API endpoint to fetch model earnings data for a user.

**Endpoint:** `GET /api/model-earnings?userId={userId}`

**Response Structure:**
```json
{
  "success": true,
  "totalTokens": 1250,
  "totalEarnings": 0.1250,
  "modelsCount": 3,
  "models": [
    {
      "modelId": "uuid",
      "modelName": "Premium Model 1",
      "modelCategory": "premium",
      "characterName": "Emma",
      "characterImage": "https://...",
      "totalUsageCount": 45,
      "totalTokensConsumed": 650,
      "totalEarnings": 0.0650,
      "lastUsageAt": "2025-01-25T10:30:00Z",
      "createdAt": "2025-01-20T08:00:00Z",
      "updatedAt": "2025-01-25T10:30:00Z"
    }
  ]
}
```

**Features:**
- Fetches all models owned by the user
- Retrieves earnings data for each model
- Calculates total tokens and earnings across all models
- Includes character information (name and image) for display
- Sorts models by earnings (highest first)

### 5. Monetization Page Updates

#### File: `app/monetization/page.tsx`
Enhanced to display token earnings information:

**New State:**
```javascript
const [modelEarnings, setModelEarnings] = useState<{
  totalTokens: number
  totalEarnings: number
  modelsCount: number
  models: any[]
  loading: boolean
}>({...})
```

**New UI Section in Earnings Tab:**

1. **Summary Stats Card:**
   - Total Tokens: Shows cumulative tokens consumed across all models
   - Total Earnings: Shows cumulative earnings at $0.0001/token
   - Earning Models: Shows count of models generating revenue

2. **Earnings by Model:**
   - Lists each model with earnings
   - Shows model/character image
   - Displays usage count and tokens consumed
   - Shows individual model earnings
   - Includes last usage date

3. **Empty State:**
   - Displayed when user has no model earnings yet
   - Encourages user to purchase models
   - Links to premium models page

## How It Works

### Earnings Flow

1. **User Initiates Chat:**
   - User sends a message to a character
   - Frontend calls `/api/deduct-token` with userId and characterId

2. **Token Deduction:**
   - System checks user's token balance
   - Deducts 1 token (or configured amount)
   - Records transaction in `token_transactions` table

3. **Model Identification:**
   - System looks up model associated with the character
   - Checks if model has an owner via `user_models` table

4. **Earnings Calculation:**
   - If user is different from model owner:
     - Calculates earnings: tokens × $0.0001
     - Logs usage in `model_usage_logs`
     - Updates `model_creator_earnings` aggregates

5. **Display:**
   - User navigates to Monetization → Earnings tab
   - System fetches earnings data via `/api/model-earnings`
   - Displays token counts and calculated earnings

### Earnings Rate

**Current Rate:** $0.0001 per token

**Examples:**
- 1 token = $0.0001
- 10 tokens = $0.0010
- 100 tokens = $0.0100
- 1,000 tokens = $0.1000
- 10,000 tokens = $1.0000

### Key Business Logic

1. **Self-Usage Prevention:**
   - Users don't earn from their own model usage
   - Prevents gaming the system

2. **Automatic Tracking:**
   - All earnings are automatically tracked
   - No manual intervention required

3. **Real-time Updates:**
   - Earnings update with each chat message
   - Aggregates maintained in real-time

4. **Graceful Failures:**
   - If model/character not found, chat continues normally
   - Earnings tracking failures don't block chat functionality

## Database Queries

### Check User's Model Earnings
```sql
SELECT 
  mce.*,
  m.name as model_name,
  c.name as character_name,
  c.image as character_image
FROM model_creator_earnings mce
JOIN models m ON mce.model_id = m.id
LEFT JOIN characters c ON m.character_id = c.id
WHERE mce.creator_id IN (
  SELECT user_id FROM user_models WHERE user_id = 'user-uuid'
);
```

### Check Recent Usage Logs for a Model
```sql
SELECT 
  mul.*,
  u.email as user_email
FROM model_usage_logs mul
JOIN auth.users u ON mul.user_id = u.id
WHERE mul.model_id = 'model-uuid'
ORDER BY mul.created_at DESC
LIMIT 10;
```

### Calculate Total Earnings for All Models
```sql
SELECT 
  SUM(total_tokens_consumed) as total_tokens,
  SUM(total_earnings) as total_earnings,
  COUNT(DISTINCT model_id) as models_count
FROM model_creator_earnings
WHERE creator_id IN (
  SELECT user_id FROM user_models WHERE user_id = 'user-uuid'
);
```

## Testing

### Test Scenario 1: Basic Earnings Flow

1. User A purchases a premium model linked to Character X
2. User B sends 10 messages to Character X (10 tokens consumed)
3. Expected Results:
   - User A's model earnings: 10 tokens × $0.0001 = $0.0010
   - `model_usage_logs` has 10 entries for the model
   - `model_creator_earnings` shows:
     - total_usage_count: 10
     - total_tokens_consumed: 10
     - total_earnings: 0.0010
4. User A views Monetization → Earnings tab
5. Should see Character X listed with $0.0010 earnings

### Test Scenario 2: Self-Usage (No Earnings)

1. User A purchases a premium model linked to Character Y
2. User A sends 5 messages to their own Character Y
3. Expected Results:
   - User A's token balance reduced by 5
   - NO earnings credited to User A
   - No records in `model_usage_logs` for this interaction
   - Model earnings remain at 0

### Test Scenario 3: Multiple Models

1. User A purchases 3 premium models (Characters X, Y, Z)
2. Various users chat with each character:
   - Character X: 100 tokens consumed
   - Character Y: 250 tokens consumed
   - Character Z: 50 tokens consumed
3. Expected Results:
   - Total tokens: 400
   - Total earnings: $0.0400
   - Monetization page shows all 3 models with individual breakdowns
   - Models sorted by earnings (Y, then X, then Z)

### Test Queries

**Check if earnings are being tracked:**
```sql
SELECT * FROM model_usage_logs 
WHERE model_id = 'your-model-id'
ORDER BY created_at DESC
LIMIT 5;
```

**Verify model owner earnings:**
```sql
SELECT 
  mce.total_tokens_consumed,
  mce.total_earnings,
  m.name as model_name
FROM model_creator_earnings mce
JOIN models m ON mce.model_id = m.id
WHERE mce.creator_id = 'user-id';
```

**Check recent transactions:**
```sql
SELECT * FROM token_transactions
WHERE user_id = 'user-id'
AND type = 'usage'
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Issue: Earnings not showing up

**Possible Causes:**
1. Model not linked to character (check `models.character_id`)
2. User owns the model (self-usage doesn't generate earnings)
3. No `user_models` record exists for the model
4. RLS policies blocking queries

**Debug Steps:**
```sql
-- Check if model exists and is linked to character
SELECT * FROM models WHERE character_id = 'character-id';

-- Check who owns the model
SELECT * FROM user_models WHERE model_id = 'model-id';

-- Check if usage is being logged
SELECT * FROM model_usage_logs WHERE model_id = 'model-id' ORDER BY created_at DESC LIMIT 5;
```

### Issue: Earnings calculation seems wrong

**Verify:**
- Check the earnings rate in code (should be 0.0001)
- Verify tokens consumed in `model_usage_logs`
- Check aggregation in `model_creator_earnings`

### Issue: API returns empty data

**Possible Causes:**
1. User has no purchased models
2. Models haven't been used yet
3. Database connection issue

**Debug:**
```javascript
// In browser console
fetch('/api/model-earnings?userId=your-user-id')
  .then(r => r.json())
  .then(console.log)
```

## Future Enhancements

### Potential Improvements

1. **Variable Earnings Rates:**
   - Allow different rates per model tier
   - Premium models could earn more per token

2. **Analytics Dashboard:**
   - Daily/weekly/monthly earnings trends
   - Peak usage times
   - User retention metrics

3. **Earnings History:**
   - Detailed transaction log
   - Export to CSV
   - Filtering and search

4. **Notifications:**
   - Alert when earnings reach threshold
   - Weekly earnings summary email
   - New user interaction notifications

5. **Bonus System:**
   - Bonus for high-performing models
   - Referral bonuses
   - Achievement rewards

6. **Withdrawal Integration:**
   - Link earnings to withdrawal system
   - Automatic payout thresholds
   - Multiple payout methods

## Security Considerations

1. **RLS Policies:**
   - Ensure users can only see their own earnings
   - Prevent unauthorized model earnings manipulation

2. **Input Validation:**
   - Validate all user IDs and character IDs
   - Prevent SQL injection
   - Sanitize all inputs

3. **Rate Limiting:**
   - Prevent abuse of the earnings system
   - Limit API calls per user

4. **Audit Trail:**
   - All earnings transactions are logged
   - Immutable records for accountability

## Maintenance

### Regular Checks

1. **Database Performance:**
   - Monitor query performance
   - Add indexes if needed
   - Archive old usage logs

2. **Earnings Accuracy:**
   - Periodic audits of calculations
   - Verify aggregation accuracy
   - Check for discrepancies

3. **User Feedback:**
   - Monitor support tickets
   - Track user satisfaction
   - Iterate based on feedback

## API Reference

### GET /api/model-earnings

Fetches earnings data for a user's models.

**Query Parameters:**
- `userId` (required): UUID of the user

**Response:**
```typescript
{
  success: boolean
  totalTokens: number
  totalEarnings: number
  modelsCount: number
  models: Array<{
    modelId: string
    modelName: string
    modelCategory: string
    characterName: string | null
    characterImage: string | null
    totalUsageCount: number
    totalTokensConsumed: number
    totalEarnings: number
    lastUsageAt: string
    createdAt: string
    updatedAt: string
  }>
}
```

**Error Responses:**
- 400: Missing userId
- 500: Server error

### POST /api/deduct-token

Deducts tokens and tracks earnings.

**Request Body:**
```typescript
{
  userId: string
  amount?: number (default: 1)
  characterId?: string
}
```

**Response:**
```typescript
{
  success: boolean
  message: string
  newBalance: number
}
```

## Conclusion

This implementation provides a complete token earnings tracking system that:
- Automatically tracks model usage
- Calculates and aggregates earnings in real-time
- Provides clear visibility into earnings on the monetization page
- Prevents gaming through self-usage detection
- Scales efficiently with proper database indexing
- Maintains data integrity through proper logging

The system is production-ready and can handle multiple models and concurrent users efficiently.
