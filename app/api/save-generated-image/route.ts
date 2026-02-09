import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase/client"
import { getAnonymousUserId } from "@/lib/anonymous-user"
import { uploadImageToBunny } from "@/lib/cloudinary-upload"

export async function POST(request: NextRequest) {
  try {
    const { prompt, imageUrl, modelUsed = "novita", characterId, userId: requestUserId } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing required field: imageUrl" }, { status: 400 })
    }

    console.log("[API] Request data:", { characterId, requestUserId: requestUserId ? "provided" : "not provided" })

    // Get user ID - prioritize userId from request body
    let userId: string

    if (requestUserId) {
      console.log("[API] Using userId from request body:", requestUserId)
      userId = requestUserId
    } else {
      // Fallback to session
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user?.id) {
        console.log("[API] User is authenticated:", session.user.id)
        userId = session.user.id
      } else {
        userId = getAnonymousUserId()
        console.log("[API] Using anonymous ID:", userId)
      }
    }

    // Upload image to Bunny.net CDN
    let bunnyUrl = imageUrl
    try {
      console.log("[API] Uploading image to Bunny.net CDN...")
      bunnyUrl = await uploadImageToBunny(imageUrl)
      console.log("[API] Image uploaded to Bunny.net:", bunnyUrl)
    } catch (bunnyError) {
      console.error("[API] Failed to upload to Bunny.net, using original URL:", bunnyError)
      // Continue with original URL if Bunny.net upload fails
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = await createAdminClient()
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Failed to initialize database client" }, { status: 500 })
    }

    // Check if this image URL already exists for this user to prevent duplicates
    const { data: existingImages } = await supabaseAdmin
      .from("generated_images")
      .select("id")
      .eq("user_id", userId)
      .eq("image_url", bunnyUrl)
      .limit(1)

    if (existingImages && existingImages.length > 0) {
      console.log("[API] Image already exists for this user:", existingImages[0].id)
      return NextResponse.json({ message: "Image already saved", imageId: existingImages[0].id }, { status: 200 })
    }

    // Insert the new image to generated_images table
    const insertData: any = {
      user_id: userId,
      prompt: prompt || "Generated in chat",
      image_url: bunnyUrl,
      model_used: modelUsed,
    }

    // Add character_id if provided
    if (characterId) {
      insertData.character_id = characterId
    }

    const { data: imageData, error: imageError } = await supabaseAdmin
      .from("generated_images")
      .insert(insertData)
      .select()
      .single()

    if (imageError) {
      console.error("[API] Error saving image to generated_images:", imageError)
      return NextResponse.json({ error: imageError.message }, { status: 500 })
    }

    // 🆕 CRITICAL: Also save to messages table so it shows in chat history
    if (characterId) {
      console.log("[API] Saving image message to messages table for chat history...")
      
      const { error: messageError } = await supabaseAdmin
        .from("messages")
        .insert({
          user_id: userId,
          character_id: characterId,
          role: "assistant",
          content: "", // Empty content for image messages
          is_image: true,
          image_url: bunnyUrl,
          created_at: new Date().toISOString()
        })

      if (messageError) {
        console.error("[API] Error saving image to messages table:", messageError)
        // Don't fail the whole request, image is already in generated_images
      } else {
        console.log("[API] ✅ Image successfully saved to both tables")
      }
    }

    return NextResponse.json({ success: true, image: imageData })
  } catch (error) {
    console.error("[API] Unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}