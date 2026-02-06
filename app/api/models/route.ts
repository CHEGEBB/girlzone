import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Try to get session, but do not require it
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id

    // Get all active models with character information
    const { data: models, error: modelsError } = await supabase
      .from("models")
      .select(`
        *,
        characters (
          id,
          name,
          image,
          age,
          ethnicity,
          personality,
          occupation,
          hobbies,
          relationship,
          body
        )
      `)
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true })

    if (modelsError) {
      return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 })
    }

    // Get user's purchased models if logged in; otherwise none
    let purchasedModelIds = new Set<string>()
    if (userId) {
      const { data: purchasedModels, error: purchasedError } = await supabase
        .from("user_models")
        .select("model_id")
        .eq("user_id", userId)

      if (purchasedError) {
        return NextResponse.json({ error: "Failed to fetch purchased models" }, { status: 500 })
      }
      purchasedModelIds = new Set((purchasedModels || []).map(pm => pm.model_id))
    }

    // Add purchase status and use real character images
    const modelsWithStatus = models?.map(model => {
      // Use character image if available, otherwise try model image, then fallback to placeholder
      const profileImage = model.characters?.image || model.image || '/placeholder.svg?height=400&width=300'
      const characterData = model.characters || null

      return {
        ...model,
        is_purchased: purchasedModelIds.has(model.id),
        image: profileImage,
        character: characterData
      }
    }) || []

    return NextResponse.json({
      success: true,
      models: modelsWithStatus
    })

  } catch (error) {
    console.error("Models fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
