import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadVideoToBunny } from "@/lib/cloudinary-upload"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { characterId, videoData } = await request.json();

    if (!characterId) {
      return NextResponse.json(
        { error: 'Character ID is required' },
        { status: 400 }
      );
    }

    if (!videoData) {
      return NextResponse.json(
        { error: 'Video data is required' },
        { status: 400 }
      );
    }

    console.log("[API] Received video data for character:", characterId);

    // Upload to Bunny.net (videoData is already in base64 format)
    console.log("[API] Uploading video to Bunny.net...");
    let bunnyVideoUrl: string;
    try {
      bunnyVideoUrl = await uploadVideoToBunny(videoData);
      console.log("[API] Video uploaded to Bunny.net:", bunnyVideoUrl);
    } catch (error) {
      console.error("[API] Failed to upload video to Bunny.net:", error);
      return NextResponse.json(
        { error: 'Failed to upload video to cloud storage' },
        { status: 500 }
      );
    }

    // Update character with new video_url (snake_case for database)
    console.log("[API] Updating character with video URL...");
    const { data: updatedCharacter, error: updateError } = await supabase
      .from('characters')
      .update({ video_url: bunnyVideoUrl })
      .eq('id', characterId)
      .select()
      .single();

    if (updateError) {
      console.error("[API] Error updating character:", updateError);
      return NextResponse.json(
        { error: 'Failed to update character with video URL' },
        { status: 500 }
      );
    }

    console.log("[API] Character hover video saved successfully");

    return NextResponse.json({
      success: true,
      message: 'Hover video saved successfully',
      bunnyVideoUrl: bunnyVideoUrl,
      character: updatedCharacter
    });

  } catch (error) {
    console.error('Error saving character hover video:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
