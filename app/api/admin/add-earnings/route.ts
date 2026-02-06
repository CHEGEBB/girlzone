import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
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

    const adminUserId = session.user.id
    const { userId, modelId, amount, description, transactionType } = await request.json()

    if (!userId || !modelId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user is admin using the users_view (backed by admin_users)
    const { data: adminView, error: adminViewError } = await supabase
      .from("users_view")
      .select("is_admin")
      .eq("id", adminUserId)
      .single()

    if (adminViewError || !adminView?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
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
      // Monetization toggle affects user purchases, but admin operations should still be permitted.
      // Proceed with the admin earnings addition, just log a warning for visibility.
      console.warn("Monetization disabled: proceeding with admin add-earnings operation")
    }

    // Verify the model exists and get creator info
    const { data: model, error: modelError } = await supabase
      .from("models")
      .select("id, name, creator_id")
      .eq("id", modelId)
      .single()

    if (modelError || !model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    // Verify the target user exists
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 })
    }

    // Use admin client for database operations
    const supabaseAdmin = await createAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to initialize Supabase admin client")
    }

    // Create earnings transaction
    const { data: earningsTransaction, error: transactionError } = await supabaseAdmin
      .from("earnings_transactions")
      .insert([{
        creator_id: userId,
        model_id: modelId,
        amount: amount,
        transaction_type: transactionType || "bonus",
        status: "completed",
        description: description || `Admin added earnings for ${model.name}`,
        metadata: {
          added_by_admin: adminUserId,
          admin_email: session.user.email,
          added_at: new Date().toISOString()
        }
      }])
      .select()
      .single()

    if (transactionError) {
      throw transactionError
    }

    // Update or create creator earnings record
    const { data: existingEarnings, error: earningsError } = await supabaseAdmin
      .from("model_creator_earnings")
      .select("*")
      .eq("model_id", modelId)
      .eq("creator_id", userId)
      .single()

    if (earningsError && earningsError.code !== "PGRST116") {
      throw earningsError
    }

    if (existingEarnings) {
      // Update existing earnings record
      const { error: updateError } = await supabaseAdmin
        .from("model_creator_earnings")
        .update({
          total_earnings: parseFloat(existingEarnings.total_earnings) + amount,
          last_usage_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("model_id", modelId)
        .eq("creator_id", userId)

      if (updateError) {
        throw updateError
      }
    } else {
      // Create new earnings record
      const { error: insertError } = await supabaseAdmin
        .from("model_creator_earnings")
        .insert([{
          model_id: modelId,
          creator_id: userId,
          total_usage_count: 0,
          total_tokens_consumed: 0,
          total_earnings: amount,
          last_usage_at: new Date().toISOString()
        }])

      if (insertError) {
        throw insertError
      }
    }

    // Update daily analytics
    const today = new Date().toISOString().split('T')[0]
    const { data: existingAnalytics, error: analyticsError } = await supabaseAdmin
      .from("model_analytics")
      .select("*")
      .eq("model_id", modelId)
      .eq("date", today)
      .single()

    if (analyticsError && analyticsError.code !== "PGRST116") {
      throw analyticsError
    }

    if (existingAnalytics) {
      // Update existing analytics
      const { error: updateAnalyticsError } = await supabaseAdmin
        .from("model_analytics")
        .update({
          earnings_generated: parseFloat(existingAnalytics.earnings_generated) + amount,
          updated_at: new Date().toISOString()
        })
        .eq("model_id", modelId)
        .eq("date", today)

      if (updateAnalyticsError) {
        console.error("Error updating analytics:", updateAnalyticsError)
        // Don't fail the operation for analytics errors
      }
    } else {
      // Create new analytics record
      const { error: insertAnalyticsError } = await supabaseAdmin
        .from("model_analytics")
        .insert([{
          model_id: modelId,
          date: today,
          usage_count: 0,
          unique_users: 0,
          tokens_consumed: 0,
          earnings_generated: amount,
          avg_usage_per_user: 0
        }])

      if (insertAnalyticsError) {
        console.error("Error creating analytics:", insertAnalyticsError)
        // Don't fail the operation for analytics errors
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added $${amount.toFixed(2)} earnings to ${targetUser.full_name || targetUser.email}`,
      transaction: earningsTransaction,
      model: {
        id: model.id,
        name: model.name
      },
      user: {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name
      }
    })

  } catch (error) {
    console.error("Add earnings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
