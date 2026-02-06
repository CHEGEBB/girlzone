import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"

// GET - Fetch all admin character content (optionally filtered by character)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const characterId = searchParams.get("characterId")

    const supabase = createClient()

    // Build query - RLS policies will handle access control
    let query = supabase
      .from("admin_character_content")
      .select("*")
      .order("created_at", { ascending: false })

    // Filter by character if provided
    if (characterId) {
      query = query.eq("character_id", characterId)
    }

    const { data: content, error } = await query

    if (error) {
      console.error("[API] Error fetching admin content:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, content: content || [] })
  } catch (error) {
    console.error("[API] Unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// POST - Create new admin character content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { characterId, imageUrl, tabType } = body

    if (!characterId || !imageUrl || !tabType) {
      return NextResponse.json(
        { error: "Missing required fields: characterId, imageUrl, tabType" },
        { status: 400 }
      )
    }

    if (!["gallery", "unlocked"].includes(tabType)) {
      return NextResponse.json(
        { error: "Invalid tabType. Must be 'gallery' or 'unlocked'" },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Insert content - uploaded_by will be null, which is fine since admin page handles auth
    // RLS policies ensure only authenticated users can insert
    const { data: content, error } = await supabase
      .from("admin_character_content")
      .insert({
        character_id: characterId,
        image_url: imageUrl,
        tab_type: tabType,
        uploaded_by: null, // Admin page handles auth, we don't need user ID
      })
      .select()
      .single()

    if (error) {
      console.error("[API] Error creating admin content:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, content })
  } catch (error) {
    console.error("[API] Unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
