# Token Earnings Debug Guide

## Issue: Earnings Showing Zero After Chat

### Quick Diagnosis Steps

1. **Check Console Logs After Sending a Chat Message**
   
   When you send a message, look for these logs in the browser console (F12):
   
   ```
   🟦 [DEDUCT-TOKEN] API called with userId: xxx, amount: 1, characterId: yyy
   🔍 [DEDUCT-TOKEN] Model lookup result: { found: true/false, modelId: ..., ... }
   ```

2. **Common Issues and Solutions**

   ### Issue A: Model Not Found
   **Log shows:** `found: false` or `No model found for character: xxx`
   
   **Cause:** The character you're chatting with doesn't have a linked model in the `models` table.
   
   **Solution:**
   ```sql
   -- Check if character has a model
   SELECT m.*, c.name as character_name 
   FROM models m 
   JOIN characters c ON m.character_id = c.id 
   WHERE c.id = 'your-character-id';
   
   -- If no model exists, you need to create one or link an existing model
   UPDATE models 
   SET character_id = 'your-character-id' 
   WHERE id = 'model-id';
   ```

   ### Issue B: No Model Owner
   **Log shows:** `No user_model record found for this model`
   
   **Cause:** The model exists but has no owner in the `user_models` table.
   
   **Solution:**
   ```sql
   -- Check if model has an owner
   SELECT um.*, u.email 
   FROM user_models um 
   JOIN auth.users u ON um.user_id = u.id 
   WHERE um.model_id = 'your-model-id';
   
   -- If no owner, insert one
   INSERT INTO user_models (user_id, model_id, purchased_at)
   VALUES ('owner-user-id', 'model-id', NOW());
   ```

   ### Issue C: Chatting with Own Model
   **Log shows:** `User is chatting with their own model, no earnings credited`
   
   **Cause:** You can't earn from your own chats (anti-gaming measure).
   
   **Solution:** Have another user chat with your model/character.

3. **Verify Database Setup**

   Run these queries to check your setup:

   ```sql
   -- 1. Check if character has a model
   SELECT 
     c.id as character_id,
     c.name as character_name,
     m.id as model_id,
     m.name as model_name
   FROM characters c
   LEFT JOIN models m ON m.character_id = c.id
   WHERE c.id = 'your-character-id';

   -- 2. Check if model has an owner
   SELECT 
     m.id as model_id,
     m.name as model_name,
     um.user_id as owner_id,
     u.email as owner_email
   FROM models m
   LEFT JOIN user_models um ON um.model_id = m.id
   LEFT JOIN auth.users u ON u.id = um.user_id
   WHERE m.character_id = 'your-character-id';

   -- 3. Check earnings logs
   SELECT * FROM model_usage_logs 
   WHERE model_id = 'your-model-id' 
   ORDER BY created_at DESC 
   LIMIT 5;

   -- 4. Check aggregated earnings
   SELECT * FROM model_creator_earnings 
   WHERE model_id = 'your-model-id';
   ```

4. **Test Flow**

   ### Proper Setup:
   1. User A purchases/owns a model (record in `user_models`)
   2. Model is linked to Character X (via `models.character_id`)
   3. User B chats with Character X
   4. System credits User A with $0.0001 per token

   ### Example SQL to Set Up Test:
   ```sql
   -- 1. Ensure model exists and is linked to character
   UPDATE models 
   SET character_id = 'character-x-id' 
   WHERE name = 'Model Name';

   -- 2. Ensure model has an owner (User A)
   INSERT INTO user_models (user_id, model_id, purchased_at)
   VALUES ('user-a-id', 'model-id', NOW())
   ON CONFLICT (user_id, model_id) DO NOTHING;

   -- 3. Now have User B chat with Character X
   -- Earnings should be credited to User A
   ```

## Understanding the Flow

```
User B sends message to Character X
         ↓
/api/deduct-token called with characterId
         ↓
System looks up: models WHERE character_id = 'character-x-id'
         ↓
System finds: model_id = 'abc123'
         ↓
System looks up: user_models WHERE model_id = 'abc123'
         ↓
System finds: owner = User A
         ↓
System checks: Is User B different from User A?
         ↓
YES → Credit $0.0001 to User A's earnings
NO  → Skip (self-usage)
```

## Quick Fix Checklist

- [ ] Character has a linked model in `models` table
- [ ] Model has an owner in `user_models` table
- [ ] Owner is different from the user chatting
- [ ] Model is active (`is_active = true`)
- [ ] Earnings tables exist (`model_usage_logs`, `model_creator_earnings`)

## Common Mistakes

1. **Forgetting to link character to model**
   - Models and characters are separate but linked via `character_id`

2. **No owner in user_models table**
   - Just having a model isn't enough - it needs an owner

3. **Testing with same user**
   - You won't earn from chatting with your own models

4. **Wrong character ID**
   - Make sure you're passing the correct character ID from the chat page

## Need More Help?

Check the detailed logs in:
- Browser console (F12) - Frontend logs
- Server logs - Backend API logs with emoji prefixes 🟦 🔍 💰 ✅ 🔴
