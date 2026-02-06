import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
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

    // Check if monetization is enabled (admin_settings is key/value)
    const { data: settingsRows, error: settingsError } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["monetization_enabled", "minimum_withdrawal_amount"])

    if (settingsError) {
      console.error("Error checking monetization status:", settingsError)
    }

    const settingsMap = Object.fromEntries((settingsRows || []).map((r: any) => [r.key, r.value]))

    // Default to enabled if not set
    let monetizationEnabled = true
    const monetizationRaw = settingsMap["monetization_enabled"]
    if (typeof monetizationRaw === "string") {
      monetizationEnabled = monetizationRaw.toLowerCase() !== "false"
    } else if (typeof monetizationRaw === "boolean") {
      monetizationEnabled = monetizationRaw !== false
    }

    if (!monetizationEnabled) {
      return NextResponse.json({ 
        error: "Monetization is currently disabled. Earnings are not available." 
      }, { status: 403 })
    }

    // Get completed earnings transactions
    const { data: earningsTransactions, error: earningsError } = await supabase
      .from("earnings_transactions")
      .select(`
        id,
        amount,
        transaction_type,
        description,
        created_at,
        models!inner(id, name)
      `)
      .eq("creator_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })

    if (earningsError) {
      throw earningsError
    }

    // Get withdrawal request items to see which earnings are already requested
    const { data: withdrawalItems, error: withdrawalError } = await supabase
      .from("withdrawal_request_items")
      .select(`
        earnings_transaction_id,
        withdrawal_requests!inner(
          id,
          status,
          creator_id
        )
      `)
      .eq("withdrawal_requests.creator_id", userId)
      .in("withdrawal_requests.status", ["pending", "approved", "processing"])

    if (withdrawalError) {
      throw withdrawalError
    }

    // Filter out earnings that are already in pending withdrawal requests
    const requestedEarningsIds = new Set(
      withdrawalItems.map(item => item.earnings_transaction_id)
    )

    const availableEarnings = earningsTransactions.filter(
      transaction => !requestedEarningsIds.has(transaction.id)
    )

    // Calculate totals
    const totalEarnings = earningsTransactions.reduce(
      (sum, transaction) => sum + parseFloat(transaction.amount), 0
    )
    const availableAmount = availableEarnings.reduce(
      (sum, transaction) => sum + parseFloat(transaction.amount), 0
    )
    const requestedAmount = totalEarnings - availableAmount

    const minimumAmount = parseFloat(settingsMap?.minimum_withdrawal_amount ?? "10.00")

    return NextResponse.json({
      success: true,
      data: {
        total_earnings: totalEarnings,
        available_amount: availableAmount,
        requested_amount: requestedAmount,
        minimum_withdrawal_amount: minimumAmount,
        can_withdraw: availableAmount >= minimumAmount,
        available_earnings: availableEarnings,
        total_transactions: earningsTransactions.length,
        available_transactions: availableEarnings.length
      }
    })

  } catch (error) {
    console.error("Available earnings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
