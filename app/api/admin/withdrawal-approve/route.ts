import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const supabase = createClient()

    try {
        // Get authenticated user
        const { data: { session }, error: authError } = await supabase.auth.getSession()

        if (authError || !session) {
            return NextResponse.json({ 
                error: 'Unauthorized' 
            }, { status: 401 })
        }

        const adminId = session.user.id

        // Check if user is admin
        const { data: adminUser, error: adminCheckError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('user_id', adminId)
            .single()

        if (adminCheckError || !adminUser) {
            return NextResponse.json({ 
                error: 'Admin access required' 
            }, { status: 403 })
        }

        const { request_id, action, admin_notes, transaction_hash } = await req.json()

        console.log('🟦 [WITHDRAWAL-APPROVE] Admin:', adminId, 'Action:', action, 'Request:', request_id)

        if (!request_id || !action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ 
                error: 'Invalid request. Provide request_id and action (approve/reject)' 
            }, { status: 400 })
        }

        // Get withdrawal request
        const { data: withdrawalRequest, error: requestError } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('id', request_id)
            .single()

        if (requestError || !withdrawalRequest) {
            console.error('🔴 [WITHDRAWAL-APPROVE] Request not found:', requestError)
            return NextResponse.json({ 
                error: 'Withdrawal request not found' 
            }, { status: 404 })
        }

        if (withdrawalRequest.status !== 'pending') {
            return NextResponse.json({ 
                error: 'Only pending requests can be approved/rejected' 
            }, { status: 400 })
        }

        if (action === 'approve') {
            // Get user's total earnings
            const { data: earningsData, error: earningsError } = await supabase
                .from('model_creator_earnings')
                .select('total_earnings')
                .eq('creator_id', withdrawalRequest.user_id)

            if (earningsError) {
                console.error('🔴 [WITHDRAWAL-APPROVE] Error fetching earnings:', earningsError)
                return NextResponse.json({ 
                    error: 'Failed to fetch user earnings' 
                }, { status: 500 })
            }

            const totalEarnings = earningsData?.reduce((sum, record) => 
                sum + parseFloat(record.total_earnings || '0'), 0
            ) || 0

            if (withdrawalRequest.amount > totalEarnings) {
                return NextResponse.json({ 
                    error: 'Insufficient balance. User earnings have changed.' 
                }, { status: 400 })
            }

            // Calculate new earnings (deduct withdrawal amount)
            const earningsToDeduct = withdrawalRequest.amount
            let remainingDeduction = earningsToDeduct

            // Deduct from each earning record proportionally
            for (const record of earningsData) {
                if (remainingDeduction <= 0) break

                const recordEarnings = parseFloat(record.total_earnings || '0')
                const deductAmount = Math.min(recordEarnings, remainingDeduction)

                const { error: updateError } = await supabase
                    .from('model_creator_earnings')
                    .update({
                        total_earnings: recordEarnings - deductAmount,
                        updated_at: new Date().toISOString()
                    })
                    .eq('creator_id', withdrawalRequest.user_id)
                    .eq('model_id', (record as any).model_id)

                if (updateError) {
                    console.error('🔴 [WITHDRAWAL-APPROVE] Error updating earnings:', updateError)
                    return NextResponse.json({ 
                        error: 'Failed to deduct earnings' 
                    }, { status: 500 })
                }

                remainingDeduction -= deductAmount
            }

            // Create withdrawal transaction record
            const { error: transactionError } = await supabase
                .from('withdrawal_transactions')
                .insert({
                    user_id: withdrawalRequest.user_id,
                    withdrawal_request_id: withdrawalRequest.id,
                    amount: withdrawalRequest.amount,
                    payment_method: withdrawalRequest.payment_method,
                    payment_details: withdrawalRequest.payment_details,
                    status: 'completed',
                    transaction_hash: transaction_hash || null,
                    admin_notes: admin_notes || null,
                    created_at: new Date().toISOString()
                })

            if (transactionError) {
                console.error('🔴 [WITHDRAWAL-APPROVE] Error creating transaction:', transactionError)
                return NextResponse.json({ 
                    error: 'Failed to create transaction record' 
                }, { status: 500 })
            }

            // Update withdrawal request status
            const { error: updateRequestError } = await supabase
                .from('withdrawal_requests')
                .update({
                    status: 'completed',
                    approved_by: adminId,
                    approved_at: new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                    admin_notes: admin_notes || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', request_id)

            if (updateRequestError) {
                console.error('🔴 [WITHDRAWAL-APPROVE] Error updating request:', updateRequestError)
                return NextResponse.json({ 
                    error: 'Failed to update withdrawal request' 
                }, { status: 500 })
            }

            console.log('✅ [WITHDRAWAL-APPROVE] Withdrawal approved and processed')

            return NextResponse.json({ 
                success: true,
                message: 'Withdrawal approved and processed successfully',
                amount_deducted: earningsToDeduct
            })

        } else if (action === 'reject') {
            // Update withdrawal request status to rejected
            const { error: updateRequestError } = await supabase
                .from('withdrawal_requests')
                .update({
                    status: 'rejected',
                    approved_by: adminId,
                    approved_at: new Date().toISOString(),
                    admin_notes: admin_notes || 'Request rejected by admin',
                    updated_at: new Date().toISOString()
                })
                .eq('id', request_id)

            if (updateRequestError) {
                console.error('🔴 [WITHDRAWAL-APPROVE] Error rejecting request:', updateRequestError)
                return NextResponse.json({ 
                    error: 'Failed to reject withdrawal request' 
                }, { status: 500 })
            }

            console.log('✅ [WITHDRAWAL-APPROVE] Withdrawal rejected')

            return NextResponse.json({ 
                success: true,
                message: 'Withdrawal request rejected'
            })
        }

    } catch (error) {
        console.error('🔴 [WITHDRAWAL-APPROVE] Unexpected error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

// GET endpoint to fetch all withdrawal requests for admin
export async function GET(req: Request) {
    const supabase = createClient()

    try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()

        if (authError || !session) {
            return NextResponse.json({ 
                error: 'Unauthorized' 
            }, { status: 401 })
        }

        const adminId = session.user.id

        // Check if user is admin
        const { data: adminUser, error: adminCheckError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('user_id', adminId)
            .single()

        if (adminCheckError || !adminUser) {
            return NextResponse.json({ 
                error: 'Admin access required' 
            }, { status: 403 })
        }

        // Fetch all withdrawal requests with user details
        const { data: requests, error: requestsError } = await supabase
            .from('withdrawal_requests')
            .select(`
                *,
                user:user_id (
                    email
                )
            `)
            .order('created_at', { ascending: false })

        if (requestsError) {
            console.error('🔴 [WITHDRAWAL-APPROVE] Error fetching requests:', requestsError)
            return NextResponse.json({ 
                error: 'Failed to fetch withdrawal requests' 
            }, { status: 500 })
        }

        return NextResponse.json({ 
            success: true,
            requests: requests || []
        })

    } catch (error) {
        console.error('🔴 [WITHDRAWAL-APPROVE] Unexpected error:', error)
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 })
    }
}
