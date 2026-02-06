# SEO & Favicon Management Implementation

This document outlines the implementation of the SEO and favicon management system that allows admins to customize metadata and favicons from the admin dashboard.

## Features Implemented

### 1. Admin Dashboard - SEO & Branding Tab
**Location:** `/admin/dashboard` - "SEO & Branding" tab

#### Site Information Section
- **Site Name**: The name of your site
- **Logo Text**: Text displayed in the logo and used for dynamic favicon generation
- **SEO Title**: Title shown in search engines and browser tabs (max 60 characters)
- **SEO Description**: Description shown in search engine results (max 160 characters)

#### Favicon Settings Section
- **Upload Custom Favicon**: Upload PNG, ICO, or SVG files (max 1MB)
- **Live Preview**: Preview custom or dynamic favicon before uploading
- **Dynamic Favicon**: Automatically generated SVG favicon using the first letter of Logo Text
- **Fallback System**: If no custom favicon is uploaded, a dynamic favicon is generated

### 2. Files Created/Modified

#### New Files
1. **`app/api/upload-favicon/route.ts`**
   - Handles favicon file uploads to Bunny.net CDN
   - Validates file type (PNG, ICO, SVG) and size (max 1MB)
   - Returns CDN URL for uploaded favicon

#### Modified Files
1. **`app/admin/dashboard/page.tsx`**
   - Added new "SEO & Branding" tab
   - Added form fields for site name, logo text, SEO title, SEO description
   - Added favicon upload functionality with preview
   - Separated save handlers for SEO and pricing settings

2. **`app/api/site-settings/route.ts`**
   - Extended GET endpoint to fetch `seo_title`, `seo_description`, and `custom_favicon_url`
   - Extended POST endpoint to save these new fields
   - Added cache invalidation after updates

3. **`lib/metadata-utils.ts`**
   - Updated `generateSiteMetadata()` to use custom favicon URL if available
   - Falls back to dynamic SVG favicon if no custom favicon is set
   - Uses SEO title and description from database

4. **`app/layout.tsx`**
   - Removed hardcoded favicon links from `<head>`
   - Favicon is now managed dynamically via metadata API

5. **`components/site-context.tsx`**
   - Added `customFaviconUrl` to `SiteSettings` type
   - Updated `updateSettings()` to handle favicon URL
   - Added favicon URL to settings synchronization

### 3. How It Works

#### Dynamic Metadata Flow
1. User visits the site
2. `app/layout.tsx` calls `generateMetadata()`
3. `generateSiteMetadata()` fetches settings from `/api/site-settings`
4. If `custom_favicon_url` exists, it's used; otherwise, a dynamic SVG is generated
5. Metadata is returned to Next.js for rendering

#### Favicon Upload Flow
1. Admin selects favicon file in dashboard
2. File is validated (type, size)
3. Preview is shown immediately
4. Admin clicks "Upload Favicon"
5. File is uploaded to Bunny.net CDN via `/api/upload-favicon`
6. CDN URL is returned and saved to database
7. Settings are updated via `/api/site-settings`
8. Favicon appears on next page load

#### SEO Settings Flow
1. Admin modifies SEO fields in dashboard
2. Admin clicks "Save SEO Settings"
3. Settings are sent to `/api/site-settings`
4. Database is updated via upsert
5. Cache is cleared
6. Changes appear on next page load

### 4. Database Schema

The following keys are stored in the `site_settings` table:

```sql
-- Existing keys
site_name (JSON string)
logo_text (JSON string)
language (JSON string)
pricing (JSON object)

-- New keys added
seo_title (JSON string)
seo_description (JSON string)
custom_favicon_url (JSON string)
```

### 5. Environment Variables Required

Ensure these Bunny.net environment variables are set in `.env.local`:

```env
BUNNY_STORAGE_ZONE_NAME=your-storage-zone
BUNNY_STORAGE_API_KEY=your-api-key
BUNNY_STORAGE_URL=https://storage.bunnycdn.com
BUNNY_CDN_URL=https://your-cdn-url.b-cdn.net
```

### 6. Usage Instructions

#### For Admins

1. **Navigate to Admin Dashboard**
   - Go to `/admin/dashboard`
   - Click on the "SEO & Branding" tab

2. **Update Site Information**
   - Edit Site Name, Logo Text, SEO Title, SEO Description
   - Click "Save SEO Settings"

3. **Upload Custom Favicon**
   - Click "Choose File" under "Upload Custom Favicon"
   - Select a PNG, ICO, or SVG file (max 1MB, recommended 32x32 or 64x64 pixels)
   - Preview will appear on the right
   - Click "Upload Favicon" to save
   - The custom favicon will appear on all pages

4. **Remove Custom Favicon**
   - Currently, to remove a custom favicon and return to the dynamic one, you can:
     - Upload a new favicon
     - Or contact a developer to manually clear the `custom_favicon_url` field

### 7. Features & Benefits

✅ **SEO Optimization**
- Customize page titles and descriptions for better search engine visibility
- Character counters ensure optimal length for search results

✅ **Brand Customization**
- Upload custom favicon to match your brand
- Dynamic favicon generation as fallback
- Changes apply site-wide instantly

✅ **User Experience**
- Live preview before uploading
- Clear validation messages
- Separate save buttons for different settings

✅ **Performance**
- CDN-hosted favicons for fast loading
- Cached metadata with 60-second TTL
- Optimized file size limits

### 8. Technical Notes

- **Favicon Format Support**: PNG, ICO, SVG
- **Maximum File Size**: 1MB
- **CDN Storage**: Bunny.net (in `/favicons/` directory)
- **Cache Duration**: 60 seconds for metadata
- **Dynamic Favicon**: Generated as inline SVG data URL

### 9. Future Enhancements

Potential improvements for future versions:

- [ ] Option to remove custom favicon without uploading a new one
- [ ] Multiple
