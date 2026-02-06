import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const characterId = searchParams.get("characterId")

    if (!characterId) {
      return NextResponse.json({ error: "Missing required parameter: characterId" }, { status: 400 })
    }

    const supabase = createClient()

    // Fetch ALL images for this character from ALL users
    const { data: images, error } = await supabase
      .from("generated_images")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
      .limit(100) // Limit to prevent too many results

    if (error) {
      console.error("[API] Error fetching character gallery:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, images: images || [] })
  } catch (error) {
    console.error("[API] Unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
