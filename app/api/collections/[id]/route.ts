import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { createAdminClient } from "@/lib/supabase-admin"
import { getAnonymousUserId } from "@/lib/anonymous-user"

// GET /api/collections/[id] - Fetch a specific collection with its images
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Collection ID is required" },
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

    // Get the collection
    const { data: collection, error: collectionError } = await supabaseAdmin
      .from("collections")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (collectionError) {
      console.error("Error fetching collection:", collectionError)
      if (collectionError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: collectionError.message }, { status: 500 })
    }

    // Get images in this collection
    const { data: images, error: imagesError } = await supabaseAdmin
      .from("generated_images")
      .select("*")
      .eq("collection_id", id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (imagesError) {
      console.error("Error fetching collection images:", imagesError)
      return NextResponse.json({ error: imagesError.message }, { status: 500 })
    }

    return NextResponse.json({
      collection,
      images: images || [],
    })
  } catch (error) {
    console.error("Error in collection GET:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/collections/[id] - Update a collection
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, description } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Collection ID is required" },
        { status: 400 }
      )
    }

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
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating collection:", error)
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ collection: data })
  } catch (error) {
    console.error("Error in collection PUT:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/collections/[id] - Delete a collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Collection ID is required" },
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

    // First, remove collection_id from all images in this collection
    const { error: updateImagesError } = await supabaseAdmin
      .from("generated_images")
      .update({ collection_id: null })
      .eq("collection_id", id)
      .eq("user_id", userId)

    if (updateImagesError) {
      console.error("Error removing images from collection:", updateImagesError)
      return NextResponse.json({ error: updateImagesError.message }, { status: 500 })
    }

    // Then delete the collection
    const { error } = await supabaseAdmin
      .from("collections")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) {
      console.error("Error deleting collection:", error)
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Collection deleted successfully" })
  } catch (error) {
    console.error("Error in collection DELETE:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
