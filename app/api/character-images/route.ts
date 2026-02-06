import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const characterId = searchParams.get("characterId")
    const userId = searchParams.get("userId")

    console.log("🔵 [CHARACTER-IMAGES API] Request received:", { characterId, userId })

    if (!characterId || !userId) {
      console.error("🔴 [CHARACTER-IMAGES API] Missing parameters")
      return NextResponse.json({ error: "Missing required parameters: characterId and userId" }, { status: 400 })
    }

    const supabase = createClient()

    console.log("🔍 [CHARACTER-IMAGES API] Querying generated_images table...")
    // Fetch images for this character and user
    const { data: images, error } = await supabase
      .from("generated_images")
      .select("*")
      .eq("character_id", characterId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("🔴 [CHARACTER-IMAGES API] Error fetching character images:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("✅ [CHARACTER-IMAGES API] Query successful. Found", images?.length || 0, "images")
    if (images && images.length > 0) {
      console.log("📸 [CHARACTER-IMAGES API] Sample image:", {
        id: images[0].id,
        image_url: images[0].image_url?.substring(0, 50) + "...",
        character_id: images[0].character_id,
        user_id: images[0].user_id,
        created_at: images[0].created_at
      })
    }

    return NextResponse.json({ success: true, images: images || [] })
  } catch (error) {
    console.error("🔴 [CHARACTER-IMAGES API] Unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
