import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { createAdminClient } from "@/lib/supabase-admin"
import { getAnonymousUserId } from "@/lib/anonymous-user"
import { deleteImageFromCloudinaryAndDatabase, moveImageToCollection } from "@/lib/collections-storage-utils"

// GET /api/images/[id] - Fetch a specific image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Image ID is required" },
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
      .from("generated_images")
      .select(`
        *,
        collection:collections(name, description)
      `)
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (error) {
      console.error("Error fetching image:", error)
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Image not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ image: data })
  } catch (error) {
    console.error("Error in image GET:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/images/[id] - Update image metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updates = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Image ID is required" },
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

    // Prepare update data
    const updateData: any = {}
    
    if (updates.prompt !== undefined) updateData.prompt = updates.prompt
    if (updates.tags !== undefined) updateData.tags = updates.tags
    if (updates.favorite !== undefined) updateData.favorite = updates.favorite
    if (updates.collection_id !== undefined) updateData.collection_id = updates.collection_id

    const { data, error } = await supabaseAdmin
      .from("generated_images")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select(`
        *,
        collection:collections(name, description)
      `)
      .single()

    if (error) {
      console.error("Error updating image:", error)
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Image not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ image: data })
  } catch (error) {
    console.error("Error in image PUT:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/images/[id] - Delete image from Cloudinary and database
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Image ID is required" },
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

    // Verify the image exists and belongs to the user
    const { data: image, error: fetchError } = await supabaseAdmin
      .from("generated_images")
      .select("id, cloudinary_public_id")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (fetchError) {
      console.error("Error fetching image for deletion:", fetchError)
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Image not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Delete from Cloudinary and database
    await deleteImageFromCloudinaryAndDatabase(id)

    return NextResponse.json({ message: "Image deleted successfully" })
  } catch (error) {
    console.error("Error in image DELETE:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
