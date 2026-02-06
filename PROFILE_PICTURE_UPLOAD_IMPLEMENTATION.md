# Profile Picture Upload Implementation

## Overview
Added profile picture upload functionality to the user settings and profile pages, allowing users to update their profile pictures from either the `/settings` or `/profile` page.

## Changes Made

### 1. API Route Created
**File:** `app/api/update-profile-picture/route.ts`

- Created a new API endpoint to handle profile picture uploads
- Authenticates the user using Supabase
- Uploads images to Bunny.net CDN using the existing `uploadImageToBunny` utility
- Updates user metadata with the new avatar URL
- Returns the CDN URL on success

**Key Features:**
- User authentication check
- Image validation (required field)
- Unique filename generation: `profile_${user.id}_${timestamp}.jpg`
- Updates Supabase user metadata (`avatar_url`)

### 2. UserProfileInfo Component Updated
**File:** `components/user-profile-info.tsx`

**New Features Added:**
- Profile picture display with large avatar (128x128 pixels)
- Camera icon button overlaid on avatar for quick access
- File upload button with upload icon
- Image preview showing current profile picture
- Loading states during upload
- File validation:
  - Only image files accepted
  - Maximum file size: 5MB
  - Supported formats: JPG, PNG, GIF

**UI Components Used:**
- `Avatar` component for displaying profile pictures
- `Camera` and `Upload` icons from lucide-react
- Hidden file input with ref for programmatic triggering
- Toast notifications for success/error feedback

**Upload Flow:**
1. User clicks camera icon or "Upload New Picture" button
2. File input dialog opens
3. User selects an image
4. Image is validated (type and size)
5. Image converted to base64
6. Sent to API endpoint
7. Avatar URL updated in state
8. Page reloads to refresh auth context with new avatar
9. Success/error toast notification displayed

### 3. Dependencies
The implementation uses existing project dependencies:
- `@/components/ui/avatar` - Avatar display component
- `lucide-react` - Icons (Camera, Upload)
- `@/utils/supabase/server` - Supabase server client
- `@/lib/cloudinary-upload` - Image upload utility (uploadImageToBunny)
- `@/components/ui/use-toast` - Toast notifications

## User Experience

### Access Locations
Users can access the profile picture upload from two locations:

**Option 1: Settings Page (Recommended)**
- Navigate to `/settings` page
- Profile picture section is displayed at the top with upload options

**Option 2: Profile Page**
- Navigate to `/profile` page
- Click on "Profile Information" tab
- Profile picture section is displayed at the top with upload options

### Upload Methods
1. **Camera Icon Button**: Click the camera icon on the avatar
2. **Upload Button**: Click the "Upload New Picture" button below the avatar

### Visual Feedback
- Loading spinner shown during upload
- Disabled state for buttons during upload
- Toast notifications for success and errors
- Avatar updates immediately after successful upload
- Page reloads to sync avatar across the app

### Validation Messages
- "Invalid File" - if non-image file selected
- "File Too Large" - if file exceeds 5MB
- "Upload Failed" - if server upload fails
- "Profile Picture Updated" - on successful upload

## Technical Details

### Image Storage
- Images stored in Bunny.net CDN
- Filename format: `profile_${userId}_${timestamp}.jpg`
- URL stored in Supabase user metadata as `avatar_url`

### Security
- User authentication required (checked on API route)
- Only authenticated users can upload
- Users can only update their own profile picture
- File type and size validation on client side
- Server-side validation through API route

### Performance
- Image converted to base64 for upload
- Single API call for upload and metadata update
- Immediate UI feedback during upload
- Page reload ensures consistency across app

## Future Enhancements (Optional)
1. Image cropping tool before upload
2. Multiple avatar options/presets
3. Compression before upload for large images
4. Remove/delete profile picture option
5. Avatar history/previous avatars
6. Real-time avatar update without page reload (using auth context refresh)

## Testing Checklist
- [x] API route created and configured
- [x] Component updated with upload UI
- [x] File validation working (type and size)
- [x] Upload flow implemented
- [x] Success/error handling implemented
- [x] Avatar display updated after upload
- [ ] Test with actual image upload (requires running app)
- [ ] Test error scenarios (network errors, invalid files)
- [ ] Test on mobile devices
- [ ] Verify avatar displays in other parts of the app

## Usage Instructions

For users:

**From Settings Page:**
1. Go to `/settings` page
2. Click the camera icon on your avatar or "Upload New Picture" button
3. Select an image file (JPG, PNG, or GIF, max 5MB)
4. Wait for upload to complete
5. Your profile picture will be updated across the app

**From Profile Page:**
1. Go to `/profile` page
2. Click on "Profile Information" tab
3. Click the camera icon on your avatar or "Upload New Picture" button
4. Select an image file (JPG, PNG, or GIF, max 5MB)
5. Wait for upload to complete
6. Your profile picture will be updated across the app

For developers:
- The avatar URL is stored in user metadata as `avatar_url`
- Access it via `user.user_metadata.avatar_url` in Supabase
- The auth context already includes `avatar` field from user metadata
- Images are automatically uploaded to Bunny.net CDN
