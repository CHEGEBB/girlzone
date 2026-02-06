import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToBunny } from '@/lib/cloudinary-upload';

export async function POST(request: NextRequest) {
  try {
    const { imageData, filename } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    console.log('[Upload API] Uploading image to Bunny.net...');

    // Generate a unique filename if not provided
    const finalFilename = filename || `admin-character_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

    // Upload to Bunny.net
    const cdnUrl = await uploadImageToBunny(imageData, finalFilename);

    console.log('[Upload API] Upload successful:', cdnUrl);

    return NextResponse.json({
      success: true,
      url: cdnUrl,
    });

  } catch (error) {
    console.error('[Upload API] Error uploading image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}
