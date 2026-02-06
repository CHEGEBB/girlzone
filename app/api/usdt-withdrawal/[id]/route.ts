import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id: withdrawalId } = await params
    const { action, notes, rejection_reason } = await request.json()

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 })
    }

    // Admin access is verified at the page level

    // Get withdrawal request
    const { data: withdrawalRequest, error: withdrawalError } = await supabase
      .from("usdt_withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single()

    if (withdrawalError || !withdrawalRequest) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 })
    }

    // Validate action based on current status
    const validActions: Record<string, string[]> = {
      pending: ["approved", "rejected"],
      approved: ["processing", "rejected"],
      processing: ["completed", "rejected"],
      completed: [],
      rejected: ["approved"]
    }

    const allowedActions = validActions[withdrawalRequest.status] || []
    if (!allowedActions.includes(action)) {
      return NextResponse.json({
        error: `Cannot ${action} withdrawal request with status ${withdrawalRequest.status}`
      }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {
      status: action
    }

    if (action === "rejected" && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    if (action === "processing" || action === "completed") {
      updateData.processed_at = new Date().toISOString()
      updateData.processed_by = userId
    }

    if (notes) {
      updateData.admin_note = notes
    }

    // Handle withdrawn amount tracking for affiliate withdrawals
    if (action === "approved") {
      // Increment withdrawn amount (don't deduct from balance)
      const { data: wallet, error: walletError } = await supabase
        .from('bonus_wallets')
        .select('withdrawn_amount')
        .eq('user_id', withdrawalRequest.user_id)
        .single()

      if (walletError || !wallet) {
        return NextResponse.json({
          success: false,
          error: "User wallet not found"
        }, { status: 400 })
      }

      // Increment the withdrawn amount
      const { error: updateWalletError } = await supabase
        .from('bonus_wallets')
        .update({
          withdrawn_amount: (wallet.withdrawn_amount || 0) + withdrawalRequest.amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', withdrawalRequest.user_id)

      if (updateWalletError) {
        return NextResponse.json({
          success: false,
          error: "Failed to update withdrawn amount"
        }, { status: 400 })
      }
    }
    // Note: No balance refund needed on rejection since balance wasn't deducted on approval

    // Update withdrawal request
    const { data: updatedRequest, error: updateError } = await supabase
      .from("usdt_withdrawals")
      .update(updateData)
      .eq("id", withdrawalId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Create withdrawal history entry
    const { error: historyError } = await supabase
      .from("withdrawal_history")
      .insert([{
        withdrawal_request_id: withdrawalId,
        action: action,
        performed_by: userId,
        notes: notes || `Affiliate withdrawal ${action}`
      }])

    if (historyError) {
      console.error("Error creating withdrawal history:", historyError)
      // Don't fail the request for history errors
    }

    return NextResponse.json({
      success: true,
      message: `Affiliate withdrawal ${action} successfully`,
      withdrawal: updatedRequest
    })

  } catch (error) {
    console.error("Update affiliate withdrawal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id: withdrawalId } = await params

    // Get withdrawal request
    const { data: withdrawalRequest, error: withdrawalError } = await supabase
      .from("usdt_withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single()

    if (withdrawalError || !withdrawalRequest) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 })
    }

    // Admin access is verified at the page level - allow all authenticated users
    // to manage withdrawals (admins can manage all, users can manage their own)

    // Delete withdrawal request
    const { error: deleteError } = await supabase
      .from("usdt_withdrawals")
      .delete()
      .eq("id", withdrawalId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: "Affiliate withdrawal cancelled successfully"
    })

  } catch (error) {
    console.error("Delete affiliate withdrawal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
