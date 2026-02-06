# Chat Page Right Sidebar Fixes

## Issues Fixed

### 1. Token Balance Display Issue ✅
**Problem:** 
- Token balance was reading from `user_profiles.token_balance` 
- But the deduct-token API updates `user_tokens.balance`
- This caused the displayed tokens to not update in real-time

**Solution:**
- Changed token balance source from `user_profiles.token_balance` to `user_tokens.balance`
- Made `loadTokenBalance` a reusable callback function
- Added real-time token balance update after each message send
- Token balance now correctly updates after:
  - Sending chat messages
  - Unlocking gallery
  - Any token deduction

### 2. Unlocked Tab Functionality ✅
**Status:** Already working correctly

The unlocked tab properly:
- Loads user-specific generated images from `generated_images` table
- Filters by `character_id` and `user_id`
- Shows images the user has generated in chat
- Displays clickable thumbnails in a 2-column grid
- Opens images in modal when clicked
- Shows appropriate empty state message when no images exist

## Code Changes

### File: `app/chat/[id]/page.tsx`

**Change 1: Fixed Token Balance Loading**
```typescript
// Before: Read from user_profiles
const { data, error } = await supabase
  .from("user_profiles")
  .select("token_balance")
  .eq("user_id", user.id)
  .single()

// After: Read from user_tokens
const { data, error } = await supabase
  .from("user_tokens")
  .select("balance")
  .eq("user_id", user.id)
  .single()
```

**Change 2: Real-time Token Update After Message Send**
```typescript
// After successful token deduction
console.log('✅ [FRONTEND] Token deducted successfully! New balance:', data.newBalance)
// Update the token balance in the UI immediately
setTokenBalance(data.newBalance)
```

**Change 3: Token Update After Gallery Unlock**
```typescript
// After successful gallery unlock
if (data.newBalance !== undefined) {
  setTokenBalance(data.newBalance)
} else {
  // Reload token balance if not returned by API
  await loadTokenBalance()
}
```

## Testing Checklist

- [x] Token balance displays correctly from `user_tokens` table
- [x] Token balance updates immediately after sending a message
- [x] Token balance updates after unlocking gallery
- [x] Unlocked tab shows user's generated images
- [x] Gallery tab shows all character images (locked/unlocked)
- [x] Tab switching works smoothly
- [x] Images open in modal when clicked
- [x] Empty states display appropriately

## Database Tables Used

1. **user_tokens** - Stores user token balances
   - `balance`: Current token count
   - `user_id`: User identifier

2. **generated_images** - Stores all generated images
   - `user_id`: Owner of the image
   - `character_id`: Associated character
   - `image_url`: Cloudinary URL

3. **gallery_unlocks** - Tracks gallery unlock status
   - `user_id`: User who unlocked
   - `character_id`: Character gallery unlocked

## API Endpoints Involved

1. **GET /api/character-images** - Fetches user's unlocked images
   - Parameters: `characterId`, `userId`
   - Returns: User-specific generated images

2. **GET /api/character-gallery** - Fetches all gallery images
   - Parameters: `characterId`
   - Returns: All images for the character

3. **POST /api/deduct-token** - Deducts tokens and returns new balance
   - Parameters: `userId`, `characterId`, `amount`
   - Returns: `newBalance` after deduction

4. **POST /api/unlock-gallery** - Unlocks gallery for character
   - Parameters: `userId`, `characterId`
   - Returns: `newBalance` after token deduction

## Additional Features Verified

### "Get More Tokens" Button ✅
- Located in the top section of the right sidebar
- Navigates to `/premium` page when clicked
- Properly styled and positioned

### Gallery Unlock Button ✅
- Shows "Unlock Gallery" button when gallery is locked
- Costs 1,000 tokens to unlock
- Shows `InsufficientTokensDialog` popup if user has insufficient balance
- Same dialog used for call and text-to-speech features
- Unlocks are character-specific (per character, not global)
- Stores unlock in `gallery_unlocks` table with `user_id` and `character_id`
- Once unlocked for a character, user can view all gallery images for that character

## Notes

- The token balance is now sourced from the correct table (`user_tokens`)
- Real-time updates ensure users see accurate token counts
- Both Gallery and Unlocked tabs function as expected
- Images are properly loaded from the database
- All tab transitions work smoothly
- Gallery unlocks are per-character, not global
- Unlock gallery API now properly uses `user_tokens` table (fixed from `user_profiles`)
- Transaction logging added for gallery unlocks
