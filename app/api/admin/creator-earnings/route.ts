import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
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

    const adminUserId = session.user.id

    // Check if user is admin using the users_view (backed by admin_users)
    const { data: adminView, error: adminViewError } = await supabase
      .from("users_view")
      .select("is_admin")
      .eq("id", adminUserId)
      .single()

    if (adminViewError || !adminView?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Use admin client for database operations
    const supabaseAdmin = await createAdminClient()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    let earningsData: any[] = []

    // Try to get data from model_creator_earnings first (if it exists)
    // Use admin client to bypass RLS
    const { data: existingEarnings, error: existingError } = await supabaseAdmin
      .from("model_creator_earnings")
      .select("*")
      .order("total_earnings", { ascending: false })

    if (!existingError && existingEarnings && existingEarnings.length > 0) {
      console.log('✅ [ADMIN CREATOR EARNINGS] Using existing earnings data from table')
      earningsData = existingEarnings
    } else {
      console.log('⚠️ [ADMIN CREATOR EARNINGS] No existing earnings data, calculating dynamically...')

      // Fallback: Calculate earnings dynamically
      // Get all models that have been used
      const { data: usageLogs, error: usageError } = await supabaseAdmin
        .from("model_usage_logs")
        .select("model_id, tokens_consumed, created_at, user_id")

      if (usageError) {
        console.error("Error fetching usage logs:", usageError)
        return NextResponse.json({ error: "Failed to fetch usage data" }, { status: 500 })
      }

      console.log('🔍 [ADMIN CREATOR EARNINGS] Found usage logs:', usageLogs?.length || 0)

      // Group by model and calculate totals
      const modelEarningsMap = new Map()

      usageLogs?.forEach((log: any) => {
        const modelId = log.model_id
        if (!modelEarningsMap.has(modelId)) {
          modelEarningsMap.set(modelId, {
            totalTokens: 0,
            usageCount: 0,
            lastUsageAt: null,
            users: new Set()
          })
        }
        const modelData = modelEarningsMap.get(modelId)
        modelData.totalTokens += log.tokens_consumed || 0
        modelData.usageCount += 1
        modelData.users.add(log.user_id)
        if (!modelData.lastUsageAt || new Date(log.created_at) > new Date(modelData.lastUsageAt)) {
          modelData.lastUsageAt = log.created_at
        }
      })

      // Convert to earnings data format
      const earningsData: any[] = []
      for (const [modelId, data] of modelEarningsMap) {
        if (data.totalTokens > 0) {
          // Get model info to find creator
          const { data: modelInfo } = await supabaseAdmin
            .from("models")
            .select("creator_id, name")
            .eq("id", modelId)
            .single()

          if (modelInfo?.creator_id) {
            earningsData.push({
              id: `calculated-${modelId}`,
              model_id: modelId,
              creator_id: modelInfo.creator_id,
              total_usage_count: data.usageCount,
              total_tokens_consumed: data.totalTokens,
              total_earnings: (data.totalTokens * 0.0001).toFixed(4),
              last_usage_at: data.lastUsageAt,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        }
      }

      console.log('🔍 [ADMIN CREATOR EARNINGS] Calculated earnings data:', {
        count: earningsData.length,
        hasData: earningsData.length > 0,
        sample: earningsData.slice(0, 2)
      })
    }

    // Get unique creator IDs and model IDs from calculated data
    const creatorIds = [...new Set(earningsData.map((e: any) => e.creator_id).filter(Boolean))]
    const modelIds = [...new Set(earningsData.map((e: any) => e.model_id).filter(Boolean))]

    // Fetch models data
    const { data: modelsData, error: modelsFetchError } = await supabaseAdmin
      .from("models")
      .select("id, name, creator_id")
      .in("id", modelIds)

    if (modelsFetchError) {
      console.error("Error fetching models:", modelsFetchError)
    }

    // Fetch user data from users_view
    const { data: usersData, error: usersError } = await supabase
      .from("users_view")
      .select("id, email, username")
      .in("id", creatorIds)

    if (usersError) {
      console.error("Error fetching users:", usersError)
    }

    // Create lookup maps
    const modelsMap = new Map((modelsData || []).map((m: any) => [m.id, m]))
    const profilesMap = new Map((usersData || []).map((u: any) => [u.id, {
      id: u.id,
      email: u.email,
      full_name: u.username || u.email
    }]))

    // Combine the data
    const earningsWithJoins = (earningsData || []).map((earning: any) => ({
      ...earning,
      models: modelsMap.get(earning.model_id) || null,
      profiles: profilesMap.get(earning.creator_id) || null
    }))

    // Calculate total earnings from tokens (more accurate than stored total_earnings which may be truncated)
    const totalEarningsCalculated = earningsWithJoins.reduce((sum: number, earning: any) =>
      sum + ((earning.total_tokens_consumed || 0) * 0.0001), 0
    )
    console.log('📊 [ADMIN CREATOR EARNINGS] Earnings summary:', {
      totalRecords: earningsWithJoins.length,
      totalEarnings: totalEarningsCalculated.toFixed(4),
      totalTokens: earningsWithJoins.reduce((sum, e) => sum + (e.total_tokens_consumed || 0), 0),
      sampleRecords: earningsWithJoins.slice(0, 3).map((e: any) => ({
        modelId: e.model_id,
        creatorId: e.creator_id,
        tokens: e.total_tokens_consumed,
        storedEarnings: e.total_earnings,
        calculatedEarnings: ((e.total_tokens_consumed || 0) * 0.0001).toFixed(4)
      }))
    })

    // Fetch earnings transactions
    const { data: transactionsData, error: transactionsError } = await supabaseAdmin
      .from("earnings_transactions")
      .select("*")
      .order("created_at", { ascending: false })

    if (transactionsError) {
      console.error("Error fetching earnings transactions:", transactionsError)
      return NextResponse.json({ error: "Failed to fetch earnings transactions" }, { status: 500 })
    }

    // Get unique creator IDs and model IDs from transactions
    const transactionCreatorIds = [...new Set((transactionsData || []).map((t: any) => t.creator_id).filter(Boolean))]
    const transactionModelIds = [...new Set((transactionsData || []).map((t: any) => t.model_id).filter(Boolean))]

    // Fetch models for transactions
    const { data: transactionModelsData, error: transactionModelsError } = await supabaseAdmin
      .from("models")
      .select("id, name")
      .in("id", transactionModelIds)

    if (transactionModelsError) {
      console.error("Error fetching transaction models:", transactionModelsError)
    }

    // Filter users for transactions
    const transactionFilteredUsers = (usersData || []).filter((user: any) =>
      transactionCreatorIds.includes(user.id)
    )

    // Create lookup maps for transactions
    const transactionModelsMap = new Map((transactionModelsData || []).map((m: any) => [m.id, m]))
    const transactionProfilesMap = new Map(transactionFilteredUsers.map((u: any) => [u.id, {
      id: u.id,
      email: u.email,
      full_name: u.username || u.email
    }]))

    // Combine transaction data
    const transactionsWithJoins = (transactionsData || []).map((transaction: any) => ({
      ...transaction,
      models: transactionModelsMap.get(transaction.model_id) || null,
      profiles: transactionProfilesMap.get(transaction.creator_id) || null
    }))

    return NextResponse.json({
      success: true,
      creatorEarnings: earningsWithJoins,
      transactions: transactionsWithJoins
    })

  } catch (error) {
    console.error("Creator earnings fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
