import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { createAdminClient } from "@/lib/supabase-admin"
import { getAnonymousUserId } from "@/lib/anonymous-user"

// GET /api/collections - Fetch all collections for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    let userId: string

    if (session?.user?.id) {
      userId = session.user.id
    } else {
      userId = getAnonymousUserId()
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = await createAdminClient()

    // Get collections with image count
    const { data, error } = await supabaseAdmin
      .from("collections")
      .select(`
        *,
        image_count:generated_images(count)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching collections:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format the response
    const collections = (data || []).map((collection) => ({
      ...collection,
      image_count: collection.image_count?.[0]?.count || 0,
    }))

    return NextResponse.json({ collections })
  } catch (error) {
    console.error("Error in collections GET:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/collections - Create a new collection
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json()

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    let userId: string

    if (session?.user?.id) {
      userId = session.user.id
    } else {
      userId = getAnonymousUserId()
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = await createAdminClient()

    const { data, error } = await supabaseAdmin
      .from("collections")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        user_id: userId,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating collection:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ collection: data }, { status: 201 })
  } catch (error) {
    console.error("Error in collections POST:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
