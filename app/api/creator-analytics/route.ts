import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { getModelUsageStats } from "@/lib/earnings-calculator"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30")
    const modelId = searchParams.get("modelId")

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
        error: "Monetization is currently disabled. Analytics are not available." 
      }, { status: 403 })
    }

    if (modelId) {
      // Get analytics for a specific model
      const { data: model, error: modelError } = await supabase
        .from("models")
        .select("id, name, creator_id")
        .eq("id", modelId)
        .eq("creator_id", userId)
        .single()

      if (modelError || !model) {
        return NextResponse.json({ error: "Model not found or access denied" }, { status: 404 })
      }

      // Get usage statistics
      const usageStats = await getModelUsageStats(modelId, days)

      // Get creator earnings
      const { data: creatorEarnings, error: earningsError } = await supabase
        .from("model_creator_earnings")
        .select("*")
        .eq("model_id", modelId)
        .single()

      // Get daily analytics
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startDateStr = startDate.toISOString().split('T')[0]

      const { data: dailyAnalytics, error: dailyError } = await supabase
        .from("model_analytics")
        .select("*")
        .eq("model_id", modelId)
        .gte("date", startDateStr)
        .order("date", { ascending: true })

      // Get recent usage logs
      const { data: recentUsage, error: usageError } = await supabase
        .from("model_usage_logs")
        .select(`
          id,
          usage_type,
          tokens_consumed,
          earnings_generated,
          created_at,
          users!inner(email)
        `)
        .eq("model_id", modelId)
        .order("created_at", { ascending: false })
        .limit(20)

      return NextResponse.json({
        success: true,
        analytics: {
          model: {
            id: model.id,
            name: model.name
          },
          period: {
            days,
            start_date: startDateStr,
            end_date: new Date().toISOString().split('T')[0]
          },
          usage_stats: usageStats,
          creator_earnings: creatorEarnings,
          daily_analytics: dailyAnalytics || [],
          recent_usage: recentUsage || []
        }
      })
    } else {
      // Get analytics for all user's models
      const { data: userModels, error: modelsError } = await supabase
        .from("models")
        .select("id, name, created_at")
        .eq("creator_id", userId)
        .eq("is_active", true)

      if (modelsError) {
        throw modelsError
      }

      // Get creator earnings for all models
      const { data: allEarnings, error: earningsError } = await supabase
        .from("model_creator_earnings")
        .select(`
          *,
          models!inner(id, name, creator_id)
        `)
        .eq("creator_id", userId)

      // Get total earnings summary
      const totalEarnings = allEarnings?.reduce((sum, earning) => sum + parseFloat(earning.total_earnings), 0) || 0
      const totalUsage = allEarnings?.reduce((sum, earning) => sum + earning.total_usage_count, 0) || 0
      const totalTokens = allEarnings?.reduce((sum, earning) => sum + earning.total_tokens_consumed, 0) || 0

      // Get top performing models
      const topModels = allEarnings?.sort((a, b) => parseFloat(b.total_earnings) - parseFloat(a.total_earnings)).slice(0, 5) || []

      // Get recent earnings transactions
      const { data: recentTransactions, error: transactionsError } = await supabase
        .from("earnings_transactions")
        .select(`
          *,
          models!inner(id, name)
        `)
        .eq("creator_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)

      return NextResponse.json({
        success: true,
        analytics: {
          summary: {
            total_models: userModels?.length || 0,
            total_earnings: totalEarnings,
            total_usage: totalUsage,
            total_tokens: totalTokens,
            avg_earnings_per_model: userModels?.length > 0 ? totalEarnings / userModels.length : 0
          },
          top_models: topModels,
          all_earnings: allEarnings || [],
          recent_transactions: recentTransactions || [],
          period: {
            days,
            start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
          }
        }
      })
    }

  } catch (error) {
    console.error("Creator analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
