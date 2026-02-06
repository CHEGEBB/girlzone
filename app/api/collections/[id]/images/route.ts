import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { createAdminClient } from "@/lib/supabase-admin"
import { getAnonymousUserId } from "@/lib/anonymous-user"

// POST /api/collections/[id]/images - Add images to a collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { imageIds } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Collection ID is required" },
        { status: 400 }
      )
    }

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "Image IDs array is required" },
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

    // Verify the collection exists and belongs to the user
    const { data: collection, error: collectionError } = await supabaseAdmin
      .from("collections")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (collectionError) {
      console.error("Error verifying collection:", collectionError)
      if (collectionError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: collectionError.message }, { status: 500 })
    }

    // Update images to add them to the collection
    const { data, error } = await supabaseAdmin
      .from("generated_images")
      .update({ collection_id: id })
      .in("id", imageIds)
      .eq("user_id", userId)
      .select()

    if (error) {
      console.error("Error adding images to collection:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `${data.length} images added to collection`,
      updatedImages: data,
    })
  } catch (error) {
    console.error("Error in collection images POST:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/collections/[id]/images - Remove images from a collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { imageIds } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Collection ID is required" },
        { status: 400 }
      )
    }

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "Image IDs array is required" },
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

    // Remove images from the collection (set collection_id to null)
    const { data, error } = await supabaseAdmin
      .from("generated_images")
      .update({ collection_id: null })
      .in("id", imageIds)
      .eq("collection_id", id)
      .eq("user_id", userId)
      .select()

    if (error) {
      console.error("Error removing images from collection:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `${data.length} images removed from collection`,
      updatedImages: data,
    })
  } catch (error) {
    console.error("Error in collection images DELETE:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
