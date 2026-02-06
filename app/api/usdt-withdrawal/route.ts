import { createClient } from "@/lib/supabase-server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// PATCH - Admin update withdrawal status
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }



    const body = await request.json()
    const { id, action, notes, rejection_reason } = body

    if (!id || !action) {
      return NextResponse.json(
        { error: "Withdrawal ID and action are required" },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = ['approved', 'rejected', 'processing', 'completed']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }

    // Get current withdrawal
    const { data: withdrawal, error: fetchError } = await supabase
      .from('usdt_withdrawals')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !withdrawal) {
      return NextResponse.json(
        { error: "Withdrawal not found" },
        { status: 404 }
      )
    }

    // Update withdrawal status
    const updateData: any = {
      status: action,
      processed_at: action === 'completed' ? new Date().toISOString() : null,
    }

    if (action === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    const { data: updatedWithdrawal, error: updateError } = await supabase
      .from('usdt_withdrawals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating withdrawal:", updateError)
      return NextResponse.json(
        { error: "Failed to update withdrawal" },
        { status: 500 }
      )
    }

    // If rejecting withdrawal, refund funds back to wallet
    if (action === 'rejected' && withdrawal.status === 'pending') {
      // Get current balance first
      const { data: wallet, error: walletFetchError } = await supabase
        .from('bonus_wallets')
        .select('balance')
        .eq('user_id', withdrawal.user_id)
        .single()

      if (!walletFetchError && wallet) {
        const { error: walletError } = await supabase
          .from('bonus_wallets')
          .update({
            balance: wallet.balance + withdrawal.amount
          })
          .eq('user_id', withdrawal.user_id)

        if (walletError) {
          console.error("Error refunding wallet:", walletError)
        }
      }
    }

    // Update transaction status
    await supabase
      .from('bonus_transactions')
      .update({
        status: action,
        description: action === 'rejected' && rejection_reason
          ? `USDT withdrawal rejected: ${rejection_reason}`
          : `USDT withdrawal ${action}`
      })
      .eq('user_id', withdrawal.user_id)
      .eq('transaction_type', 'withdrawal')
      .eq('amount', -withdrawal.amount)
      .eq('status', 'pending')

    // Log admin action
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: `usdt_withdrawal_${action}`,
        target_type: 'usdt_withdrawal',
        target_id: id,
        details: {
          withdrawal_id: id,
          user_id: withdrawal.user_id,
          amount: withdrawal.amount,
          action,
          notes,
          rejection_reason
        }
      })

    return NextResponse.json({
      success: true,
      withdrawal: updatedWithdrawal,
      message: `Withdrawal ${action} successfully`
    })
  } catch (error) {
    console.error("Error in usdt-withdrawal PATCH API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Request USDT withdrawal
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { amount, usdtAddress } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid withdrawal amount" },
        { status: 400 }
      )
    }

    if (!usdtAddress) {
      return NextResponse.json(
        { error: "USDT address is required" },
        { status: 400 }
      )
    }

    // Minimum withdrawal check ($10)
    if (amount < 10) {
      return NextResponse.json(
        { error: "Minimum withdrawal amount is $10" },
        { status: 400 }
      )
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('bonus_wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      )
    }

    // Check sufficient balance
    if (wallet.balance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      )
    }

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('usdt_withdrawals')
      .insert({
        user_id: user.id,
        amount,
        usdt_address: usdtAddress,
        status: 'pending',
      })
      .select()
      .single()

    if (withdrawalError) {
      console.error("Error creating withdrawal:", withdrawalError)
      return NextResponse.json(
        { error: "Failed to create withdrawal request" },
        { status: 500 }
      )
    }

    // Deduct from wallet balance (pending)
    const { error: updateError } = await supabase
      .from('bonus_wallets')
      .update({
        balance: wallet.balance - amount,
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error("Error updating wallet:", updateError)
      // Rollback withdrawal
      await supabase
        .from('usdt_withdrawals')
        .delete()
        .eq('id', withdrawal.id)

      return NextResponse.json(
        { error: "Failed to process withdrawal" },
        { status: 500 }
      )
    }

    // Record transaction
    await supabase
      .from('bonus_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'withdrawal',
        amount: -amount,
        description: `USDT withdrawal to ${usdtAddress.substring(0, 10)}...`,
        status: 'pending',
      })

    return NextResponse.json({
      success: true,
      withdrawal,
      message: "Withdrawal request submitted successfully",
    })
  } catch (error) {
    console.error("Error in usdt-withdrawal POST API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET - Get user's withdrawal history or admin view of all withdrawals
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const isAdmin = searchParams.get('admin') === 'true'

    if (isAdmin) {
      // Admin view - get all withdrawals with user info
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }



      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('usdt_withdrawals')
        .select('*')
        .order('requested_at', { ascending: false })

      if (withdrawalsError) {
        console.error("Error fetching admin withdrawals:", withdrawalsError)
        return NextResponse.json(
          { error: "Failed to fetch withdrawals" },
          { status: 500 }
        )
      }

      // Create service client with admin privileges for user lookup
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // For admin view, try to get actual user information
      const withdrawalsWithProfiles = await Promise.all(
        (withdrawals || []).map(async (withdrawal) => {
          try {
            // Try to get user info from auth admin API using service role
            const { data: userData, error: userError } = await serviceSupabase.auth.admin.getUserById(withdrawal.user_id)

            if (userData?.user && !userError) {
              const email = userData.user.email
              const username = userData.user.user_metadata?.username ||
                             userData.user.user_metadata?.preferred_username ||
                             email?.split('@')[0] || // Use part before @ as username
                             null

              return {
                ...withdrawal,
                profiles: {
                  id: userData.user.id,
                  email: email || `User ${withdrawal.user_id.substring(0, 8)}...`,
                  username: username,
                  full_name: userData.user.user_metadata?.full_name ||
                           userData.user.user_metadata?.name ||
                           userData.user.user_metadata?.display_name ||
                           username ||
                           null
                }
              }
            }
          } catch (authError) {
            console.log("Could not get user info for", withdrawal.user_id, authError)
          }

          // Fallback to partial ID
          return {
            ...withdrawal,
            profiles: {
              id: withdrawal.user_id,
              email: `User ${withdrawal.user_id.substring(0, 8)}...`,
              full_name: null
            }
          }
        })
      )

      return NextResponse.json({
        success: true,
        withdrawals: withdrawalsWithProfiles,
      })
    } else {
      // User view - get only their own withdrawals
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }

      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('usdt_withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false })

      if (withdrawalsError) {
        console.error("Error fetching user withdrawals:", withdrawalsError)
        return NextResponse.json(
          { error: "Failed to fetch withdrawals" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        withdrawals: withdrawals || [],
      })
    }
  } catch (error) {
    console.error("Error in usdt-withdrawal GET API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
