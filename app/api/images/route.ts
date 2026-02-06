import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { createAdminClient } from "@/lib/supabase-admin"
import { getAnonymousUserId } from "@/lib/anonymous-user"
import { uploadImageToCloudinaryAndSave, deleteImageFromCloudinaryAndDatabase } from "@/lib/collections-storage-utils"

// GET /api/images - Fetch all images for the current user with collection support
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const collectionId = searchParams.get("collection_id")
    const favorite = searchParams.get("favorite")
    const search = searchParams.get("search")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

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

    let query = supabaseAdmin
      .from("generated_images")
      .select(`
        *,
        collection:collections(name, description)
      `)
      .eq("user_id", userId)

    if (collectionId) {
      query = query.eq("collection_id", collectionId)
    }

    if (favorite !== null) {
      query = query.eq("favorite", favorite === "true")
    }

    if (search) {
      query = query.ilike("prompt", `%${search}%`)
    }

    query = query.order("created_at", { ascending: false })

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + (parseInt(limit) || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching images:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ images: data || [] })
  } catch (error) {
    console.error("Error in images GET:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/images - Upload and save image with collection support
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const prompt = formData.get("prompt") as string
    const modelUsed = formData.get("model_used") as string
    const collectionId = formData.get("collection_id") as string
    const tags = formData.get("tags") as string
    const folder = formData.get("folder") as string

    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
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

    // Parse tags if provided
    const parsedTags = tags ? JSON.parse(tags) : []

    // Upload to Cloudinary and save to database
    const result = await uploadImageToCloudinaryAndSave({
      imageFile,
      prompt,
      modelUsed: modelUsed || "unknown",
      collectionId: collectionId || undefined,
      tags: parsedTags,
      folder: folder || "collections",
    })

    return NextResponse.json({ image: result }, { status: 201 })
  } catch (error) {
    console.error("Error in images POST:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
