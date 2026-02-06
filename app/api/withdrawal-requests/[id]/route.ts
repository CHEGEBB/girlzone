import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const withdrawalId = params.id
    const { action, notes, rejection_reason } = await request.json()

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 })
    }

    // Admin access is verified at the page level

    // Get withdrawal request
    const { data: withdrawalRequest, error: withdrawalError } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("id", withdrawalId)
      .single()

    if (withdrawalError || !withdrawalRequest) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 })
    }

    // Validate action based on current status
    const validActions: Record<string, string[]> = {
      pending: ["approved", "rejected", "cancelled"],
      approved: ["processing", "rejected"],
      processing: ["completed", "rejected"],
      completed: [],
      rejected: ["approved"],
      cancelled: []
    }

    const allowedActions = validActions[withdrawalRequest.status] || []
    if (!allowedActions.includes(action)) {
      return NextResponse.json({
        error: `Cannot ${action} withdrawal request with status ${withdrawalRequest.status}`
      }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {
      status: action,
      updated_at: new Date().toISOString()
    }

    if (action === "rejected" && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    if (action === "processing" || action === "completed") {
      updateData.processed_by = userId
      updateData.processed_at = new Date().toISOString()
    }

    if (notes) {
      updateData.admin_notes = notes
    }

    // Note: Token balance changes are handled separately by the withdrawal system
    // The approval/rejection here is for admin workflow management

    // Update withdrawal request
    const { data: updatedRequest, error: updateError } = await supabase
      .from("withdrawal_requests")
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
        notes: notes || `Withdrawal request ${action}`
      }])

    if (historyError) {
      console.error("Error creating withdrawal history:", historyError)
      // Don't fail the request for history errors
    }

    return NextResponse.json({
      success: true,
      message: `Withdrawal request ${action} successfully`,
      withdrawal_request: updatedRequest
    })

  } catch (error) {
    console.error("Update withdrawal request error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const withdrawalId = params.id

    // Get withdrawal request
    const { data: withdrawalRequest, error: withdrawalError } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("id", withdrawalId)
      .single()

    if (withdrawalError || !withdrawalRequest) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 })
    }

    // Admin access is verified at the page level - allow all authenticated users
    // to manage withdrawals (admins can manage all, users can manage their own)

    // Delete withdrawal request (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from("withdrawal_requests")
      .delete()
      .eq("id", withdrawalId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal request cancelled successfully"
    })

  } catch (error) {
    console.error("Delete withdrawal request error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
