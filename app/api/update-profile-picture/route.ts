import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { uploadImageToBunny } from '@/lib/cloudinary-upload';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    console.log('[Update Profile Picture API] Uploading profile picture to Bunny.net...');

    // Generate a unique filename for the profile picture
    const filename = `profile_${user.id}_${Date.now()}.jpg`;

    // Upload to Bunny.net
    const cdnUrl = await uploadImageToBunny(imageData, filename);

    console.log('[Update Profile Picture API] Upload successful:', cdnUrl);

    // Update user metadata with new avatar URL
    const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
      data: {
        avatar_url: cdnUrl
      }
    });

    if (updateError) {
      console.error('[Update Profile Picture API] Error updating user metadata:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile picture' },
        { status: 500 }
      );
    }

    console.log('[Update Profile Picture API] Profile picture updated successfully');

    return NextResponse.json({
      success: true,
      avatar_url: cdnUrl,
    });

  } catch (error) {
    console.error('[Update Profile Picture API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update profile picture' },
      { status: 500 }
    );
  }
}
