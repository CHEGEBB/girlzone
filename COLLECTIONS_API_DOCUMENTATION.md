# Collections API Documentation

This document describes the comprehensive collections API system that integrates image storage with both database and Cloudinary for the `/collections` endpoint.

## Overview

The collections system allows users to:
- Create, read, update, and delete collections
- Organize generated images into collections
- Store images in both database and Cloudinary
- Move images between collections
- Manage image metadata and tags

## API Endpoints

### Collections Management

#### GET /api/collections
Fetch all collections for the current user.

**Response:**
```json
{
  "collections": [
    {
      "id": "uuid",
      "name": "My Collection",
      "description": "Collection description",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z",
      "image_count": 5,
      "cloudinary_folder": "collections/user-id/my-collection",
      "is_public": false,
      "thumbnail_url": null
    }
  ]
}
```

#### POST /api/collections
Create a new collection.

**Request Body:**
```json
{
  "name": "My New Collection",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "collection": {
    "id": "uuid",
    "name": "My New Collection",
    "description": "Optional description",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z",
    "cloudinary_folder": "collections/user-id/my-new-collection"
  }
}
```

#### GET /api/collections/[id]
Fetch a specific collection with its images.

**Response:**
```json
{
  "collection": {
    "id": "uuid",
    "name": "My Collection",
    "description": "Collection description",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  },
  "images": [
    {
      "id": "uuid",
      "prompt": "Image prompt",
      "image_url": "https://cloudinary.com/image.jpg",
      "created_at": "2025-01-15T10:00:00Z",
      "model_used": "flux",
      "tags": ["tag1", "tag2"],
      "favorite": false,
      "collection_id": "uuid",
      "cloudinary_public_id": "cloudinary_id",
      "cloudinary_folder": "collections/user-id/my-collection"
    }
  ]
}
```

#### PUT /api/collections/[id]
Update a collection.

**Request Body:**
```json
{
  "name": "Updated Collection Name",
  "description": "Updated description"
}
```

#### DELETE /api/collections/[id]
Delete a collection and remove all images from it.

**Response:**
```json
{
  "message": "Collection deleted successfully"
}
```

### Collection Images Management

#### POST /api/collections/[id]/images
Add images to a collection.

**Request Body:**
```json
{
  "imageIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "message": "3 images added to collection",
  "updatedImages": [...]
}
```

#### DELETE /api/collections/[id]/images
Remove images from a collection.

**Request Body:**
```json
{
  "imageIds": ["uuid1", "uuid2"]
}
```

### Image Management

#### GET /api/images
Fetch all images with optional filtering.

**Query Parameters:**
- `collection_id`: Filter by collection
- `favorite`: Filter by favorite status (true/false)
- `search`: Search in prompts
- `limit`: Limit number of results
- `offset`: Pagination offset

**Response:**
```json
{
  "images": [
    {
      "id": "uuid",
      "prompt": "Image prompt",
      "image_url": "https://cloudinary.com/image.jpg",
      "created_at": "2025-01-15T10:00:00Z",
      "model_used": "flux",
      "tags": ["tag1", "tag2"],
      "favorite": false,
      "collection_id": "uuid",
      "cloudinary_public_id": "cloudinary_id",
      "cloudinary_folder": "collections/user-id/my-collection",
      "collection": {
        "name": "My Collection",
        "description": "Collection description"
      }
    }
  ]
}
```

#### POST /api/images
Upload and save a new image with collection support.

**Request Body (FormData):**
- `image`: Image file
- `prompt`: Image prompt
- `model_used`: Model used for generation
- `collection_id`: Target collection ID (optional)
- `tags`: JSON array of tags
- `folder`: Cloudinary folder (optional)

#### GET /api/images/[id]
Fetch a specific image.

#### PUT /api/images/[id]
Update image metadata.

**Request Body:**
```json
{
  "prompt": "Updated prompt",
  "tags": ["tag1", "tag2"],
  "favorite": true,
  "collection_id": "uuid"
}
```

#### DELETE /api/images/[id]
Delete image from both Cloudinary and database.

#### POST /api/images/[id]/move-to-collection
Move image to a different collection.

**Request Body:**
```json
{
  "collection_id": "uuid" // null to remove from collection
}
```

## Database Schema

### Collections Table
```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cloudinary_folder TEXT DEFAULT 'collections',
  is_public BOOLEAN DEFAULT FALSE,
  thumbnail_url TEXT
);
```

### Generated Images Table
```sql
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  favorite BOOLEAN DEFAULT FALSE,
  cloudinary_public_id TEXT,
  cloudinary_folder TEXT DEFAULT 'collections'
);
```

## Cloudinary Integration

### Features
- Automatic folder organization based on collection names
- Public ID tracking for efficient deletion
- Folder structure: `collections/{user_id}/{collection-name}`
- Automatic cleanup of orphaned images

### Environment Variables Required
```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Upload Preset
Ensure you have an unsigned upload preset named `ai-characters-preset` configured in your Cloudinary account.

## Usage Examples

### Creating a Collection and Adding Images

```javascript
// Create a new collection
const collectionResponse = await fetch('/api/collections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Art Collection',
    description: 'A collection of my favorite AI-generated art'
  })
});
const { collection } = await collectionResponse.json();

// Upload an image to the collection
const formData = new FormData();
formData.append('image', imageFile);
formData.append('prompt', 'Beautiful landscape');
formData.append('collection_id', collection.id);
formData.append('tags', JSON.stringify(['landscape', 'nature']));

const imageResponse = await fetch('/api/images', {
  method: 'POST',
  body: formData
});
const { image } = await imageResponse.json();
```

### Moving Images Between Collections

```javascript
// Move image to a different collection
await fetch(`/api/images/${imageId}/move-to-collection`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    collection_id: targetCollectionId
  })
});

// Remove image from any collection
await fetch(`/api/images/${imageId}/move-to-collection`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    collection_id: null
  })
});
```

### Fetching Collections with Images

```javascript
// Get all collections
const collectionsResponse = await fetch('/api/collections');
const { collections } = await collectionsResponse.json();

// Get specific collection with images
const collectionResponse = await fetch(`/api/collections/${collectionId}`);
const { collection, images } = await collectionResponse.json();

// Get images filtered by collection
const imagesResponse = await fetch(`/api/images?collection_id=${collectionId}`);
const { images } = await imagesResponse.json();
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `500`: Internal Server Error

Error responses include a descriptive message:
```json
{
  "error": "Collection not found"
}
```

## Security

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own collections and images
- Anonymous users are supported with localStorage-based IDs
- All operations are validated and sanitized

## Performance Considerations

- Database indexes are created for efficient queries
- Cloudinary integration provides CDN benefits
- Pagination support for large collections
- Efficient folder organization in Cloudinary

## Migration

To set up the collections system, run the database migration:

```sql
-- Run the migration file
\i supabase/migrations/20250115_enhance_collections_cloudinary.sql
```

This will:
- Add Cloudinary fields to existing tables
- Create necessary indexes
- Set up RLS policies
- Create utility functions and views
