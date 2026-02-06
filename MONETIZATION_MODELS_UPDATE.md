# Monetization Page - Character Profile Display Update

## Summary of Changes

This update ensures that purchased models on the **/monetization** page display their real character profile pictures and use the same layout as the **/my-ai** page.

## Changes Made

### 1. Database Migration (`supabase/migrations/20250125_add_character_id_to_models.sql`)
- Added `character_id` column to the `models` table
- This column references the `characters` table to link models with their corresponding characters
- Added an index for faster queries on `character_id`

### 2. API Update (`app/api/models/route.ts`)
- Modified the models API to fetch character data via a JOIN query
- Now retrieves character information including:
  - Character name, image, age, ethnicity
  - Personality, occupation, hobbies, relationship
  - Body type
- Returns the real character image instead of placeholder images
- Includes character data in the response for display

### 3. Component Update (`components/user-models-display.tsx`)
- Updated to match the **/my-ai** page layout and styling:
  - Grid layout with 3 columns on large screens (same as my-ai)
  - Card-based design with character profile pictures
  - Displays character information (age, ethnicity, relationship)
  - Shows personality and occupation badges
  - "Owned" badge in top-left corner
  - Premium star icon in top-right corner
  - Hover effects and transitions
- Added "View Profile" button that navigates to `/characters/{character_id}`
- Handles both models with character data and legacy models without

## How to Apply the Migration

You need to run the migration on your Supabase database. Choose one of these methods:

### Method 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250125_add_character_id_to_models.sql`
4. Paste and run the SQL

### Method 2: Supabase CLI
```bash
supabase db push
```

### Method 3: Direct Database Connection
```bash
psql YOUR_DATABASE_CONNECTION_STRING -f supabase/migrations/20250125_add_character_id_to_models.sql
```

## Linking Models to Characters

After running the migration, you need to link existing models to their characters:

```sql
-- Example: Update a model to reference its character
UPDATE models 
SET character_id = 'character-uuid-here' 
WHERE id = 'model-uuid-here';
```

**Important**: When admins publish a character as a model, they should:
1. Create the model entry in the `models` table
2. Set the `character_id` field to reference the character being published

## Features

### On the Monetization Page - Models Tab
- ✅ Displays real character profile pictures
- ✅ Uses the same card layout as /my-ai page
- ✅ Shows character details (age, ethnicity, relationship)
- ✅ Displays personality and occupation badges
- ✅ "Owned" badge for purchased models
- ✅ Premium star icon for premium models
- ✅ "View Profile" button that navigates to character profile
- ✅ Responsive grid layout (1 column mobile, 2 columns tablet, 3 columns desktop)
- ✅ Hover effects and smooth transitions
- ✅ Fallback handling for models without linked characters

## Testing

After applying the migration and linking characters to models:

1. Navigate to **/monetization** page
2. Click on the **Models** tab
3. Verify that:
   - Each purchased model shows the correct character profile picture
   - Character information is displayed correctly
   - The layout matches the /my-ai page style
   - The "View Profile" button works and navigates to the correct character profile

## Backward Compatibility

The implementation includes fallback handling:
- Models without a linked character will still display
- They will show the model name instead of character name
- They will show the model category badge
- The "View Profile" button will be disabled for models without characters
