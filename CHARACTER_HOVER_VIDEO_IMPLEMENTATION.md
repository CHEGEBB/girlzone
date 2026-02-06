# Character Hover Video Implementation

## Overview
This document describes the implementation of the character hover video creation feature for the admin dashboard. Admins can now generate animated hover videos for characters using RunPod's video generation API, with videos stored in Bunny.net CDN.

## Features Implemented

### 1. Admin Dashboard Integration
**File: `app/admin/dashboard/characters/page.tsx`**

Added:
- New "Hover Video" column showing video status (✅ Has Video / ❌ No Video)
- Video camera icon button for each character
- Color-coded buttons: Purple for characters with videos, Gray for characters without
- Modal integration for video generation

### 2. Hover Video Generation Modal
**File: `components/character-hover-video-modal.tsx`**

Features:
- Character preview with image and description
- Category-specific prompt suggestions:
  - **Anime Characters**: Kawaii poses, energetic movements, cute animations
  - **Realistic Characters**: Warm smiles, graceful dancing, natural movements
- Custom prompt input field
- Real-time generation progress tracking
- Video preview before saving
- Success/error notifications
- Automatic refresh after successful generation

### 3. API Endpoints

#### Generate Character Hover Video
**File: `app/api/generate-character-hover-video/route.ts`**

- Fetches character data from database
- Uses character's current image as input
- Enhances prompt using Novita AI
- Uploads image to Bunny.net for RunPod access
- Initiates RunPod video generation (async)
- **No token cost for admin users**
- Returns job ID for status polling

Settings:
- Width: 480px
- Height: 832px  
- Length: 81 frames (~3 seconds)
- Steps: 10

#### Save Character Hover Video
**File: `app/api/save-character-hover-video/route.ts`**

- Fetches completed video from RunPod
- Converts video to base64
- Uploads to Bunny.net CDN
- Updates character record with video URL
- Returns Bunny.net CDN URL

### 4. Character Context Update
**File: `components/character-context.tsx`**

Added `refreshCharacters()` method to reload character data after video creation.

## User Flow

1. Admin navigates to `/admin/dashboard/characters`
2. Clicks video camera icon for a character
3. Modal opens showing:
   - Character preview
   - Category-specific prompt suggestions
   - Custom prompt input
4. Admin selects or enters a prompt
5. Clicks "Generate Video" button
6. System:
   - Uploads character image to Bunny.net
   - Starts RunPod video generation
   - Polls for completion every 3 seconds
   - Downloads completed video
   - Uploads to Bunny.net CDN
   - Updates character record
7. Success message shown, modal closes
8. Character table updates to show "Has Video" status

## Technical Details

### Video Generation Process

```
Character Image → Bunny.net CDN
                     ↓
                RunPod API (Generate Video)
                     ↓
              Poll Status (3s intervals)
                     ↓
           Download Completed Video
                     ↓
            Upload to Bunny.net CDN
                     ↓
         Update Character videoUrl
```

### Prompt Enhancement

Uses Novita AI's DeepSeek model to enhance prompts for better video quality:
- Transforms simple descriptions into detailed animation prompts
- Focuses on movement, emotion, and visual dynamics
- Keeps prompts concise but descriptive

### Storage

- Character images: Bunny.net CDN
- Generated videos: Bunny.net CDN
- Database field: `videoUrl` (TEXT)

## Character-Specific Prompts

### Realistic Characters (Girls/Guys)
1. "smiling warmly and winking at the camera"
2. "dancing gracefully with natural movements"
3. "waving hello enthusiastically"
4. "blowing a kiss to the camera"
5. "laughing and looking joyful"

### Anime Characters
1. "anime style character smiling and waving cutely"
2. "anime character doing a kawaii pose"
3. "anime character dancing with energetic movements"
4. "anime character making a peace sign and smiling"
5. "anime character blushing and looking shy"

## Error Handling

- Image fetch failures
- RunPod API errors
- Video upload failures
- Database update errors
- Network timeouts

All errors display user-friendly messages with option to retry.

## Admin Privileges

- **No token cost** for hover video generation
- Can regenerate videos unlimited times
- Can create videos for all characters
- Videos apply to all users viewing the character

## Database Schema

The `characters` table already has the `video_url` field:

```sql
video_url TEXT -- Stores Bunny.net CDN URL of hover video
```

## Frontend Display

The existing `character-card.tsx` component already handles hover videos:
- Shows static image by default
- Plays video on hover (desktop)
- Smooth opacity transitions
- Auto-pause on mouse leave

## Configuration Required

### Environment Variables
```env
RUNPOD_API_KEY=your_runpod_api_key
NOVITA_API_KEY=your_novita_api_key
BUNNY_STORAGE_API_KEY=your_bunny_storage_key
BUNNY_STORAGE_ZONE=your_bunny_storage_zone
BUNNY_CDN_URL=https://your-cdn-url.b-cdn.net
```

## Testing Checklist

- [x] Modal opens when clicking video button
- [x] Character-specific prompts display correctly
- [x] Custom prompt input works
- [x] Video generation starts successfully
- [x] Progress updates display
- [x] Completed video uploads to Bunny.net
- [x] Character record updates with video URL
- [x] Table refreshes to show "Has Video" status
- [x] Video displays on character cards on hover
- [x] Regenerate functionality works
- [x] Error messages display correctly

## Future Enhancements

Potential improvements:
1. Batch video generation for multiple characters
2. Video preview directly in admin table
3. Video quality settings (resolution, length)
4. Progress percentage during generation
5. Video management (delete, re-upload)
6. Analytics on video engagement
7. A/B testing different video styles

## Troubleshooting

### Video doesn't appear after generation
- Check browser console for errors
- Verify Bunny.net CDN URL is accessible
- Refresh the page to reload character data

### Generation fails
- Verify RunPod API key is valid
- Check character has valid image URL
- Ensure Bunny.net storage is configured
- Review API logs for error details

### Videos don't play on hover
- Verify video URL in database
- Check video file format (should be MP4)
- Test video URL directly in browser
- Clear browser cache

## Support

For issues or questions:
1. Check browser console for errors
2. Review API endpoint logs
3. Verify environment variables
4. Test video URLs directly
5. Check Bunny.net storage status

---

**Implementation Date**: January 30, 2025  
**Status**: ✅ Complete and Ready for Testing
