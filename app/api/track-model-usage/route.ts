import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { logModelUsage } from "@/lib/earnings-calculator"
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
    const { modelId, tokensConsumed, usageType, metadata } = await request.json()

    if (!modelId || !tokensConsumed) {
      return NextResponse.json({ error: "Model ID and tokens consumed are required" }, { status: 400 })
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
        error: "Monetization is currently disabled. Usage tracking is not available." 
      }, { status: 403 })
    }

    // Verify the model exists and is active
    const { data: model, error: modelError } = await supabase
      .from("models")
      .select("id, name, creator_id, is_active")
      .eq("id", modelId)
      .eq("is_active", true)
      .single()

    if (modelError || !model) {
      return NextResponse.json({ error: "Model not found or inactive" }, { status: 404 })
    }

    // Log the usage and calculate earnings
    const success = await logModelUsage(
      userId,
      modelId,
      tokensConsumed,
      usageType || 'image_generation',
      metadata || {}
    )

    if (!success) {
      return NextResponse.json({ error: "Failed to log model usage" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Model usage logged successfully",
      model: {
        id: model.id,
        name: model.name,
        creator_id: model.creator_id
      },
      usage: {
        tokens_consumed: tokensConsumed,
        usage_type: usageType || 'image_generation'
      }
    })

  } catch (error) {
    console.error("Model usage tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
