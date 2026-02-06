import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { uploadVideoToBunny } from "@/lib/cloudinary-upload"

export async function POST(request: NextRequest) {
  try {
    const { videoData, prompt, userId } = await request.json()

    if (!videoData || !prompt || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: videoData, prompt, or userId" },
        { status: 400 }
      )
    }

    // Get user from server-side Supabase client
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = await createAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Failed to initialize database client" }, { status: 500 })
    }

    // Check if this exact video already exists (to prevent duplicates)
    const { data: existingVideos, error: checkError } = await supabaseAdmin
      .from("generated_images")
      .select("id")
      .eq("user_id", userId)
      .eq("media_type", "video")
      .eq("prompt", prompt)
      .limit(1)

    if (checkError) {
      console.error("[API] Error checking for existing video:", checkError)
    }

    if (existingVideos && existingVideos.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Video already saved",
        videoId: existingVideos[0].id,
      })
    }

    // Upload video to Bunny.net
    console.log("[API] Uploading video to Bunny.net...")
    let bunnyUrl: string
    try {
      bunnyUrl = await uploadVideoToBunny(videoData)
      console.log("[API] Video uploaded to Bunny.net:", bunnyUrl)
    } catch (uploadError) {
      console.error("[API] Failed to upload video to Bunny.net:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload video to cloud storage" },
        { status: 500 }
      )
    }

    // Save video URL to database
    const { data: savedVideo, error: saveError } = await supabaseAdmin
      .from("generated_images")
      .insert({
        user_id: userId,
        image_url: bunnyUrl, // Bunny.net CDN URL instead of base64
        prompt: prompt,
        model_used: "runpod-video",
        media_type: "video",
      })
      .select()
      .single()

    if (saveError) {
      console.error("[API] Error saving video:", saveError)
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Video saved successfully",
      videoId: savedVideo.id,
    })
  } catch (error) {
    console.error("[API] Unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
