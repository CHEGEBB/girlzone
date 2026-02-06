import { createAdminClient } from "@/lib/supabase-admin"

export interface EarningsCalculation {
  baseEarnings: number
  usageMultiplier: number
  totalEarnings: number
  tokensConsumed: number
  usageCount: number
}

export interface ModelUsageStats {
  totalUsage: number
  uniqueUsers: number
  totalTokens: number
  avgUsagePerUser: number
  earningsPerUse: number
  totalEarnings: number
}

/**
 * Calculate earnings for a model based on usage patterns
 */
export async function calculateModelEarnings(
  modelId: string,
  tokensConsumed: number,
  usageType: 'image_generation' | 'chat' | 'other' = 'image_generation'
): Promise<EarningsCalculation> {
  try {
    const supabaseAdmin = await createAdminClient()
    
    if (!supabaseAdmin) {
      throw new Error("Failed to initialize Supabase admin client")
    }

    // Get model details
    const { data: model, error: modelError } = await supabaseAdmin
      .from("models")
      .select("earnings_per_use, earnings_per_token, creator_id")
      .eq("id", modelId)
      .single()

    if (modelError || !model) {
      throw new Error("Model not found")
    }

    // Get current usage statistics
    const { data: usageStats, error: usageError } = await supabaseAdmin
      .from("model_usage_logs")
      .select("tokens_consumed, earnings_generated")
      .eq("model_id", modelId)

    if (usageError) {
      throw usageError
    }

    const totalUsage = usageStats?.length || 0
    const totalTokens = usageStats?.reduce((sum, log) => sum + log.tokens_consumed, 0) || 0

    // Calculate base earnings
    const baseEarningsPerUse = model.earnings_per_use || 0
    const baseEarningsPerToken = model.earnings_per_token || 0.0001
    
    const baseEarnings = baseEarningsPerUse + (tokensConsumed * baseEarningsPerToken)

    // Calculate usage multiplier (more usage = higher earnings)
    // Fixed at 1.0 to prevent earnings from multiplying too fast
    let usageMultiplier = 1.0

    // Apply bonus for different usage types
    let typeMultiplier = 1.0
    switch (usageType) {
      case 'image_generation':
        typeMultiplier = 1.0 // Base rate
        break
      case 'chat':
        typeMultiplier = 0.8 // Slightly lower for chat usage
        break
      case 'other':
        typeMultiplier = 0.6 // Lower for other usage types
        break
    }

    const totalEarnings = baseEarnings * usageMultiplier * typeMultiplier

    return {
      baseEarnings,
      usageMultiplier: usageMultiplier * typeMultiplier,
      totalEarnings: Math.round(totalEarnings * 10000) / 10000, // Round to 4 decimal places
      tokensConsumed,
      usageCount: totalUsage + 1
    }
  } catch (error) {
    console.error("Error calculating model earnings:", error)
    throw error
  }
}

/**
 * Log model usage and update earnings
 */
export async function logModelUsage(
  userId: string,
  modelId: string,
  tokensConsumed: number,
  usageType: 'image_generation' | 'chat' | 'other' = 'image_generation',
  metadata: any = {}
): Promise<boolean> {
  try {
    const supabaseAdmin = await createAdminClient()
    
    if (!supabaseAdmin) {
      throw new Error("Failed to initialize Supabase admin client")
    }

    // Calculate earnings for this usage
    const earningsCalculation = await calculateModelEarnings(modelId, tokensConsumed, usageType)

    // Log the usage
    const { error: logError } = await supabaseAdmin
      .from("model_usage_logs")
      .insert({
        user_id: userId,
        model_id: modelId,
        usage_type: usageType,
        tokens_consumed: tokensConsumed,
        earnings_generated: earningsCalculation.totalEarnings,
        usage_metadata: metadata
      })

    if (logError) {
      throw logError
    }

    // Update creator earnings
    await updateCreatorEarnings(modelId, earningsCalculation.totalEarnings, tokensConsumed)

    // Update daily analytics
    await updateDailyAnalytics(modelId, earningsCalculation.totalEarnings, tokensConsumed)

    return true
  } catch (error) {
    console.error("Error logging model usage:", error)
    return false
  }
}

/**
 * Update creator earnings totals
 */
async function updateCreatorEarnings(
  modelId: string,
  earningsAmount: number,
  tokensConsumed: number
): Promise<void> {
  try {
    const supabaseAdmin = await createAdminClient()
    
    if (!supabaseAdmin) {
      throw new Error("Failed to initialize Supabase admin client")
    }

    // Get or create creator earnings record
    const { data: existingEarnings, error: selectError } = await supabaseAdmin
      .from("model_creator_earnings")
      .select("*")
      .eq("model_id", modelId)
      .single()

    if (selectError && selectError.code !== "PGRST116") {
      throw selectError
    }

    if (existingEarnings) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from("model_creator_earnings")
        .update({
          total_usage_count: existingEarnings.total_usage_count + 1,
          total_tokens_consumed: existingEarnings.total_tokens_consumed + tokensConsumed,
          total_earnings: existingEarnings.total_earnings + earningsAmount,
          last_usage_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("model_id", modelId)

      if (updateError) {
        throw updateError
      }
    } else {
      // Create new record
      const { data: model, error: modelError } = await supabaseAdmin
        .from("models")
        .select("creator_id")
        .eq("id", modelId)
        .single()

      if (modelError || !model) {
        throw new Error("Model not found")
      }

      const { error: insertError } = await supabaseAdmin
        .from("model_creator_earnings")
        .insert({
          model_id: modelId,
          creator_id: model.creator_id,
          total_usage_count: 1,
          total_tokens_consumed: tokensConsumed,
          total_earnings: earningsAmount,
          last_usage_at: new Date().toISOString()
        })

      if (insertError) {
        throw insertError
      }
    }
  } catch (error) {
    console.error("Error updating creator earnings:", error)
    throw error
  }
}

/**
 * Update daily analytics
 */
async function updateDailyAnalytics(
  modelId: string,
  earningsAmount: number,
  tokensConsumed: number
): Promise<void> {
  try {
    const supabaseAdmin = await createAdminClient()
    
    if (!supabaseAdmin) {
      throw new Error("Failed to initialize Supabase admin client")
    }

    const today = new Date().toISOString().split('T')[0]

    // Get or create daily analytics record
    const { data: existingAnalytics, error: selectError } = await supabaseAdmin
      .from("model_analytics")
      .select("*")
      .eq("model_id", modelId)
      .eq("date", today)
      .single()

    if (selectError && selectError.code !== "PGRST116") {
      throw selectError
    }

    if (existingAnalytics) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from("model_analytics")
        .update({
          usage_count: existingAnalytics.usage_count + 1,
          tokens_consumed: existingAnalytics.tokens_consumed + tokensConsumed,
          earnings_generated: existingAnalytics.earnings_generated + earningsAmount,
          updated_at: new Date().toISOString()
        })
        .eq("model_id", modelId)
        .eq("date", today)

      if (updateError) {
        throw updateError
      }
    } else {
      // Create new record
      const { error: insertError } = await supabaseAdmin
        .from("model_analytics")
        .insert({
          model_id: modelId,
          date: today,
          usage_count: 1,
          unique_users: 1, // This should be calculated separately
          tokens_consumed: tokensConsumed,
          earnings_generated: earningsAmount,
          avg_usage_per_user: 1.0
        })

      if (insertError) {
        throw insertError
      }
    }
  } catch (error) {
    console.error("Error updating daily analytics:", error)
    throw error
  }
}

/**
 * Get comprehensive model usage statistics
 */
export async function getModelUsageStats(modelId: string, days: number = 30): Promise<ModelUsageStats> {
  try {
    const supabaseAdmin = await createAdminClient()
    
    if (!supabaseAdmin) {
      throw new Error("Failed to initialize Supabase admin client")
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Get usage logs for the period
    const { data: usageLogs, error: logsError } = await supabaseAdmin
      .from("model_usage_logs")
      .select("user_id, tokens_consumed, earnings_generated")
      .eq("model_id", modelId)
      .gte("created_at", startDateStr)

    if (logsError) {
      throw logsError
    }

    const totalUsage = usageLogs?.length || 0
    const uniqueUsers = new Set(usageLogs?.map(log => log.user_id)).size
    const totalTokens = usageLogs?.reduce((sum, log) => sum + log.tokens_consumed, 0) || 0
    const totalEarnings = usageLogs?.reduce((sum, log) => sum + parseFloat(log.earnings_generated), 0) || 0

    return {
      totalUsage,
      uniqueUsers,
      totalTokens,
      avgUsagePerUser: uniqueUsers > 0 ? totalUsage / uniqueUsers : 0,
      earningsPerUse: totalUsage > 0 ? totalEarnings / totalUsage : 0,
      totalEarnings
    }
  } catch (error) {
    console.error("Error getting model usage stats:", error)
    throw error
  }
}
