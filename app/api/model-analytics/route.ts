import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get the authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's purchased models (join models only)
    const { data: userModels, error: userModelsError } = await supabase
      .from("user_models")
      .select(`
        *,
        models (
          id,
          name,
          description,
          category,
          token_cost,
          is_premium,
          features
        )
      `)
      .eq("user_id", userId)

    if (userModelsError) {
      return NextResponse.json({ error: "Failed to fetch user models" }, { status: 500 })
    }

    // Fetch earnings separately keyed by user and model
    const modelIds = (userModels || []).map((um: any) => um.model_id)
    let earningsMap: Record<string, { earnings_tokens: number; earnings_usd: number; usage_count: number; last_earned_at: string | null }> = {}
    if (modelIds.length > 0) {
      const { data: earningsRows, error: earningsError } = await supabase
        .from("model_earnings")
        .select("model_id, earnings_tokens, earnings_usd, usage_count, last_earned_at")
        .eq("user_id", userId)
        .in("model_id", modelIds)

      if (!earningsError && earningsRows) {
        earningsMap = Object.fromEntries(
          earningsRows.map((row: any) => [row.model_id, {
            earnings_tokens: row.earnings_tokens,
            earnings_usd: parseFloat(row.earnings_usd),
            usage_count: row.usage_count,
            last_earned_at: row.last_earned_at
          }])
        )
      }
    }

    // Get all available models for comparison
    const { data: allModels, error: allModelsError } = await supabase
      .from("models")
      .select("*")
      .eq("is_active", true)

    if (allModelsError) {
      return NextResponse.json({ error: "Failed to fetch all models" }, { status: 500 })
    }

    // Calculate analytics
    const purchasedModels = userModels?.map((um: any) => ({
      ...um.models,
      is_purchased: true,
      purchased_at: um.purchased_at,
      earnings: earningsMap[um.model_id] || {
        earnings_tokens: 0,
        earnings_usd: 0,
        usage_count: 0,
        last_earned_at: null
      }
    })) || []

    const availableModels = allModels?.filter(model => 
      !userModels?.some(um => um.model_id === model.id)
    ).map(model => ({
      ...model,
      is_purchased: false
    })) || []

    // Calculate summary statistics
    const totalTokensSpent = purchasedModels.reduce((sum, model) => sum + model.token_cost, 0)
    const totalEarningsTokens = purchasedModels.reduce((sum, model) => 
      sum + (model.earnings?.earnings_tokens || 0), 0
    )
    const totalEarningsUsd = purchasedModels.reduce((sum, model) => 
      sum + (model.earnings?.earnings_usd || 0), 0
    )
    const totalUsageCount = purchasedModels.reduce((sum, model) => 
      sum + (model.earnings?.usage_count || 0), 0
    )

    // Category breakdown
    const categoryBreakdown: { [key: string]: { purchased: number, earnings: number } } = {}
    purchasedModels.forEach(model => {
      if (!categoryBreakdown[model.category]) {
        categoryBreakdown[model.category] = { purchased: 0, earnings: 0 }
      }
      categoryBreakdown[model.category].purchased += 1
      categoryBreakdown[model.category].earnings += model.earnings?.earnings_usd || 0
    })

    // Most profitable model
    const mostProfitableModel = purchasedModels.reduce((max, model) => 
      !max || (model.earnings?.earnings_usd || 0) > (max.earnings?.earnings_usd || 0) ? model : max, 
      null
    )

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentActivity = purchasedModels
      .filter(model => model.earnings?.last_earned_at && 
        new Date(model.earnings.last_earned_at) > thirtyDaysAgo)
      .sort((a, b) => 
        new Date(b.earnings?.last_earned_at || 0).getTime() - 
        new Date(a.earnings?.last_earned_at || 0).getTime()
      )
      .slice(0, 5)

    return NextResponse.json({
      success: true,
      analytics: {
        summary: {
          totalModels: allModels?.length || 0,
          purchasedModels: purchasedModels.length,
          availableModels: availableModels.length,
          totalTokensSpent,
          totalEarningsTokens,
          totalEarningsUsd,
          totalUsageCount,
          averageEarningsPerModel: purchasedModels.length > 0 ? 
            totalEarningsUsd / purchasedModels.length : 0
        },
        categoryBreakdown,
        mostProfitableModel,
        recentActivity,
        purchasedModels,
        availableModels
      }
    })

  } catch (error) {
    console.error("Model analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
