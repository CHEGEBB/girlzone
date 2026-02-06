import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { createAdminClient } from "@/lib/supabase-admin"
import { getAnonymousUserId } from "@/lib/anonymous-user"
import { moveImageToCollection } from "@/lib/collections-storage-utils"

// POST /api/images/[id]/move-to-collection - Move image to a different collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { collection_id } = await request.json()

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

    // If collection_id is provided, verify the collection exists and belongs to the user
    if (collection_id) {
      const { data: collection, error: collectionError } = await supabaseAdmin
        .from("collections")
        .select("id")
        .eq("id", collection_id)
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
    }

    // Move the image to the collection
    const updatedImage = await moveImageToCollection(id, collection_id || null)

    return NextResponse.json({
      message: collection_id 
        ? "Image moved to collection successfully" 
        : "Image removed from collection successfully",
      image: updatedImage,
    })
  } catch (error) {
    console.error("Error in move image to collection:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
