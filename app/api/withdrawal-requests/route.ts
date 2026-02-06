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
    const { searchParams } = new URL(request.url)
    const isAdmin = searchParams.get("admin") === "true"

    // Check if monetization is enabled (key/value)
    const { data: monetizationSetting, error: settingsError } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "monetization_enabled")
      .maybeSingle()

    if (settingsError) {
      console.error("Error checking monetization status:", settingsError)
    }

    let monetizationEnabled = true
    const rawVal = monetizationSetting?.value
    if (typeof rawVal === "string") monetizationEnabled = rawVal.toLowerCase() !== "false"
    else if (typeof rawVal === "boolean") monetizationEnabled = rawVal !== false
    if (!monetizationEnabled) {
      return NextResponse.json({ 
        error: "Monetization is currently disabled. Withdrawal requests are not available." 
      }, { status: 403 })
    }

    if (isAdmin) {
      // Admin access is verified at the page level
      // Get all withdrawal requests for admin
      const { data: withdrawalRequests, error: withdrawalError } = await supabase
        .from("withdrawal_requests")
        .select(`
          *,
          withdrawal_history(*)
        `)
        .order("created_at", { ascending: false })

      if (withdrawalError) {
        throw withdrawalError
      }

      // Get user profiles for each withdrawal request
      const withdrawalRequestsWithProfiles = await Promise.all(
        (withdrawalRequests || []).map(async (request) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', request.creator_id)
            .single()

          // Get profiles for withdrawal history
          const historyWithProfiles = await Promise.all(
            (request.withdrawal_history || []).map(async (history: any) => {
              const { data: historyProfile, error: historyProfileError } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('id', history.performed_by)
                .single()

              return {
                ...history,
                profiles: historyProfile || { id: history.performed_by, email: 'Unknown', full_name: null }
              }
            })
          )

          return {
            ...request,
            profiles: profile || { id: request.creator_id, email: 'Unknown', full_name: null },
            withdrawal_history: historyWithProfiles
          }
        })
      )

      return NextResponse.json({
        success: true,
        withdrawal_requests: withdrawalRequestsWithProfiles
      })
    } else {
      // Get user's withdrawal requests
      const { data: withdrawalRequests, error: withdrawalError } = await supabase
        .from("withdrawal_requests")
        .select(`
          *,
          withdrawal_history(*)
        `)
        .eq("creator_id", userId)
        .order("created_at", { ascending: false })

      if (withdrawalError) {
        throw withdrawalError
      }

      // Get profiles for withdrawal history
      const withdrawalRequestsWithProfiles = await Promise.all(
        (withdrawalRequests || []).map(async (request) => {
          // Get profiles for withdrawal history
          const historyWithProfiles = await Promise.all(
            (request.withdrawal_history || []).map(async (history: any) => {
              const { data: historyProfile, error: historyProfileError } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('id', history.performed_by)
                .single()

              return {
                ...history,
                profiles: historyProfile || { id: history.performed_by, email: 'Unknown', full_name: null }
              }
            })
          )

          return {
            ...request,
            withdrawal_history: historyWithProfiles
          }
        })
      )

      return NextResponse.json({
        success: true,
        withdrawal_requests: withdrawalRequestsWithProfiles
      })
    }

  } catch (error) {
    console.error("Withdrawal requests error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const { 
      amount, 
      payout_method, 
      payout_details, 
      earnings_transaction_ids 
    } = await request.json()

    if (!amount || !payout_method || !earnings_transaction_ids || !Array.isArray(earnings_transaction_ids)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if monetization is enabled and get min withdrawal (key/value)
    const { data: settingsRows, error: settingsError } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["monetization_enabled", "minimum_withdrawal_amount"])

    if (settingsError) {
      console.error("Error checking monetization status:", settingsError)
    }

    const map = Object.fromEntries((settingsRows || []).map((r: any) => [r.key, r.value]))

    let monetizationEnabled = true
    const rawVal = map["monetization_enabled"]
    if (typeof rawVal === "string") monetizationEnabled = rawVal.toLowerCase() !== "false"
    else if (typeof rawVal === "boolean") monetizationEnabled = rawVal !== false
    if (!monetizationEnabled) {
      return NextResponse.json({ 
        error: "Monetization is currently disabled. Withdrawal requests are not available." 
      }, { status: 403 })
    }

    const minimumAmount = parseFloat(map?.minimum_withdrawal_amount ?? "10.00")
    if (amount < minimumAmount) {
      return NextResponse.json({ 
        error: `Minimum withdrawal amount is $${minimumAmount.toFixed(2)}` 
      }, { status: 400 })
    }

    // Verify earnings transactions belong to user
    const { data: earningsTransactions, error: earningsError } = await supabase
      .from("earnings_transactions")
      .select("id, amount, status")
      .in("id", earnings_transaction_ids)
      .eq("creator_id", userId)
      .eq("status", "completed")

    if (earningsError) {
      throw earningsError
    }

    if (earningsTransactions.length !== earnings_transaction_ids.length) {
      return NextResponse.json({ 
        error: "Some earnings transactions are invalid or not available for withdrawal" 
      }, { status: 400 })
    }

    // Calculate total available amount
    const totalAvailable = earningsTransactions.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0)
    if (amount > totalAvailable) {
      return NextResponse.json({ 
        error: "Withdrawal amount exceeds available earnings" 
      }, { status: 400 })
    }

    // Check for existing pending withdrawal requests
    const { data: existingRequests, error: existingError } = await supabase
      .from("withdrawal_requests")
      .select("id")
      .eq("creator_id", userId)
      .in("status", ["pending", "approved", "processing"])

    if (existingError) {
      throw existingError
    }

    if (existingRequests.length > 0) {
      return NextResponse.json({ 
        error: "You already have a pending withdrawal request" 
      }, { status: 400 })
    }

    // Create withdrawal request
    const { data: withdrawalRequest, error: withdrawalError } = await supabase
      .from("withdrawal_requests")
      .insert([{
        creator_id: userId,
        amount: amount,
        payout_method: payout_method,
        payout_details: payout_details || {},
        status: "pending"
      }])
      .select()
      .single()

    if (withdrawalError) {
      throw withdrawalError
    }

    // Create withdrawal request items
    const withdrawalItems = earnings_transaction_ids.map((transactionId: string) => {
      const transaction = earningsTransactions.find(t => t.id === transactionId)
      return {
        withdrawal_request_id: withdrawalRequest.id,
        earnings_transaction_id: transactionId,
        amount: transaction?.amount || 0
      }
    })

    const { error: itemsError } = await supabase
      .from("withdrawal_request_items")
      .insert(withdrawalItems)

    if (itemsError) {
      throw itemsError
    }

    // Create withdrawal history entry
    const { error: historyError } = await supabase
      .from("withdrawal_history")
      .insert([{
        withdrawal_request_id: withdrawalRequest.id,
        action: "created",
        performed_by: userId,
        notes: "Withdrawal request created"
      }])

    if (historyError) {
      console.error("Error creating withdrawal history:", historyError)
      // Don't fail the request for history errors
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal request created successfully",
      withdrawal_request: withdrawalRequest
    })

  } catch (error) {
    console.error("Create withdrawal request error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
