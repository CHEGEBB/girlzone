# Character Content Admin Feature - Implementation Guide

## Overview

This feature allows admins to upload images that will appear in the Gallery and Unlocked tabs of character chat pages. Admin-uploaded images are displayed seamlessly alongside user-generated content.

## What Was Implemented

### 1. **Database Table**
- Created `admin_character_content` table to store admin-uploaded images
- Separate from user-generated images to maintain data integrity
- Includes character ID, image URL, tab type (gallery/unlocked), and upload metadata

### 2. **Admin Management Page**
- New page at `/admin/dashboard/character-content`
- Accessible from the admin sidebar under "Character Content"
- Features:
  - Character selector dropdown
  - Image upload with live preview
  - Tab type selection (Gallery or Unlocked)
  - Upload to Bunny.net CDN
  - Management table showing all uploaded content
  - Delete functionality for each image

### 3. **API Routes**
- `GET /api/admin/character-content` - Fetch all admin content (with optional character filter)
- `POST /api/admin/character-content` - Upload new content to database
- `DELETE /api/admin/character-content/[id]` - Remove content

### 4. **Chat Page Integration**
- Gallery tab now shows:
  - All user-generated images
  - Admin-uploaded images marked as "gallery"
  - Merged and sorted by creation date
- Unlocked tab now shows:
  - User's unlocked images
  - Admin-uploaded images marked as "unlocked"
  - Merged and sorted by creation date
- No visual distinction between admin and user content

## Installation Instructions

### Step 1: Run the SQL Migration

Execute the following SQL migration in your Supabase SQL editor:

```sql
-- Location: supabase/migrations/20250131_create_admin_character_content.sql

-- Create table for admin-uploaded character content
CREATE TABLE IF NOT EXISTS admin_character_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    tab_type VARCHAR(20) NOT NULL CHECK (tab_type IN ('gallery', 'unlocked')),
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_content_character ON admin_character_content(character_id);
CREATE INDEX IF NOT EXISTS idx_admin_content_tab ON admin_character_content(character_id, tab_type);
CREATE INDEX IF NOT EXISTS idx_admin_content_created ON admin_character_content(created_at DESC);

-- Enable Row Level Security
ALTER TABLE admin_character_content ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to view all content
CREATE POLICY "Admins can view all content" ON admin_character_content
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Create policy to allow admins to insert content
CREATE POLICY "Admins can insert content" ON admin_character_content
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Create policy to allow admins to delete content
CREATE POLICY "Admins can delete content" ON admin_character_content
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Create policy to allow all users to view content (for displaying in chat)
CREATE POLICY "All users can view content for display" ON admin_character_content
    FOR SELECT USING (true);

-- Add comment to table
COMMENT ON TABLE admin_character_content IS 'Stores images uploaded by admins for character gallery and unlocked tabs';
COMMENT ON COLUMN admin_character_content.tab_type IS 'Determines which tab the image appears in: gallery or unlocked';
```

### Step 2: Verify Installation

1. Check that the table was created successfully:
```sql
SELECT * FROM admin_character_content LIMIT 1;
```

2. Verify permissions are working (as admin user)

## How to Use

### Uploading Character Content

1. **Access the Admin Panel**
   - Navigate to `/admin/dashboard/character-content`
   - Or click "Character Content" in the admin sidebar

2. **Select a Character**
   - Choose the character from the dropdown list

3. **Upload an Image**
   - Click "Choose File" to select an image
   - Supported formats: JPG, PNG, WebP
   - Preview will appear on the right side

4. **Choose Tab Type**
   - **Gallery**: Image will appear in the Gallery tab for all users who unlock the gallery
   - **Unlocked**: Image will appear in the Unlocked tab for all users

5. **Upload**
   - Click "Upload Content" button
   - Image will be uploaded to Bunny.net CDN
   - Database entry will be created
   - Success message will appear

### Managing Uploaded Content

1. **View All Content**
   - Scroll down to see the "Uploaded Content" table
   - Shows: thumbnail, character name, tab type, upload date

2. **Delete Content**
   - Click the trash icon next to any image
   - Confirm deletion in the popup
   - Image will be removed from the database (CDN file remains for existing references)

### Viewing Content as End User

**Gallery Tab:**
- If Gallery is locked: Shows blurred preview of first 8 images with unlock button
- If Gallery is unlocked: Shows all gallery images (user-generated + admin "gallery" images)
- Admin images blend seamlessly with user content

**Unlocked Tab:**
- Shows images the user has generated
- Also shows all admin-uploaded "unlocked" images
- Admin images blend seamlessly with user content

## Technical Details

### Files Created
- `supabase/migrations/20250131_create_admin_character_content.sql` - Database migration
- `app/admin/dashboard/character-content/page.tsx` - Admin management page
- `app/api/admin/character-content/route.ts` - GET/POST endpoints
- `app/api/admin/character-content/[id]/route.ts` - DELETE endpoint

### Files Modified
- `components/admin-sidebar.tsx` - Added navigation link
- `app/chat/[id]/page.tsx` - Updated image fetching for both tabs

### Key Features
- ✅ Bunny.net CDN integration for image hosting
- ✅ Separate database table for admin content
- ✅ Row Level Security policies
- ✅ Admin-only access controls
- ✅ Seamless integration with existing UI
- ✅ No changes to existing user-generated content logic
- ✅ Real-time preview before upload
- ✅ Easy content management and deletion

### Database Schema

```typescript
interface AdminCharacterContent {
  id: string              // UUID primary key
  character_id: string    // Character identifier
  image_url: string       // Bunny.net CDN URL
  tab_type: 'gallery' | 'unlocked'  // Tab placement
  uploaded_by: string     // Admin user ID
  created_at: string      // ISO timestamp
}
```

## Troubleshooting

### Images Not Appearing
- Check that the SQL migration ran successfully
- Verify the character ID matches exactly
- Ensure Row Level Security policies are in place
- Check browser console for API errors

### Upload Failing
- Verify Bunny.net credentials are configured
- Check file size (should be reasonable, e.g., < 5MB)
- Ensure user has admin permissions
- Check network tab for detailed error messages

### Permission Errors
- Verify user has admin role in `user_roles` table
- Check RLS policies are active
- Ensure auth session is valid

## Security Considerations

1. **Admin-Only Access**: Upload feature restricted to admin users only
2. **Row Level Security**: Database policies enforce admin-only writes
3. **Public Read**: All users can view content (necessary for chat display)
4. **CDN Storage**: Images stored on Bunny.net CDN (separate from Supabase)

## Future Enhancements (Optional)

- Bulk upload functionality
- Image compression before upload
- Additional tab types
- Image reordering within tabs
- Character content statistics
- Automated cleanup of orphaned CDN files

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all SQL migrations ran successfully
3. Ensure Bunny.net credentials are configured
4. Check admin user permissions in database

---

**Implementation Date**: January 31, 2025
**Version**: 1.0.0
**Status**: Production Ready
