import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { deductTokens } from "@/lib/token-utils"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Get the authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { modelId } = await request.json()

    if (!modelId) {
      return NextResponse.json({ error: "Model ID is required" }, { status: 400 })
    }

    // Check if monetization is enabled (key/value)
    const { data: setting, error: settingsError } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "monetization_enabled")
      .maybeSingle()

    if (settingsError) {
      console.error("Error checking monetization status:", settingsError)
    }

    let monetizationEnabled = true
    const rawVal = setting?.value
    if (typeof rawVal === "string") monetizationEnabled = rawVal.toLowerCase() !== "false"
    else if (typeof rawVal === "boolean") monetizationEnabled = rawVal !== false
    if (!monetizationEnabled) {
      return NextResponse.json({ 
        error: "Monetization is currently disabled. Model purchases are not available." 
      }, { status: 403 })
    }

    // Get model details
    const { data: model, error: modelError } = await supabase
      .from("models")
      .select("*")
      .eq("id", modelId)
      .eq("is_active", true)
      .single()

    if (modelError || !model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    // Check if user already owns this model
    const { data: existingPurchase, error: checkError } = await supabase
      .from("user_models")
      .select("id")
      .eq("user_id", userId)
      .eq("model_id", modelId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      return NextResponse.json({ error: "Failed to check existing purchase" }, { status: 500 })
    }

    if (existingPurchase) {
      return NextResponse.json({ error: "You already own this model" }, { status: 400 })
    }

    // Check if model requires tokens (premium models)
    if (model.is_premium && model.token_cost > 0) {
      // Deduct tokens for premium models
      const deductionResult = await deductTokens(
        userId,
        model.token_cost,
        `Model purchase: ${model.name}`,
        { modelId, modelName: model.name }
      )

      if (!deductionResult) {
        return NextResponse.json({
          error: "Insufficient tokens to purchase this model"
        }, { status: 402 })
      }
    }

    // Record the purchase
    const { error: purchaseError } = await supabase
      .from("user_models")
      .insert({
        user_id: userId,
        model_id: modelId
      })

    if (purchaseError) {
      return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${model.name}`,
      model: {
        id: model.id,
        name: model.name,
        description: model.description,
        category: model.category,
        features: model.features
      }
    })

  } catch (error) {
    console.error("Model purchase error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
