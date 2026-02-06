import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get user from server-side Supabase client
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    // Use admin client to bypass RLS
    const supabaseAdmin = await createAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Failed to initialize database client" }, { status: 500 })
    }

    // Fetch images for this user with character info, ordered by creation date (newest first)
    const { data: images, error } = await supabaseAdmin
      .from("generated_images")
      .select(`
        *,
        characters:character_id (
          id,
          name
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[API] Error fetching images:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to flatten character info
    const transformedImages = (images || []).map((img: any) => ({
      ...img,
      character_id: img.character_id,
      character_name: img.characters?.name || null,
    }))

    return NextResponse.json({ images: transformedImages })
  } catch (error) {
    console.error("[API] Unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { imageId } = await request.json()

    if (!imageId) {
      return NextResponse.json({ error: "Missing required field: imageId" }, { status: 400 })
    }

    // Get user from server-side Supabase client
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    // Use admin client to bypass RLS
    const supabaseAdmin = await createAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Failed to initialize database client" }, { status: 500 })
    }

    // Delete the image (only if it belongs to the user)
    const { error } = await supabaseAdmin
      .from("generated_images")
      .delete()
      .eq("id", imageId)
      .eq("user_id", userId)

    if (error) {
      console.error("[API] Error deleting image:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
