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

        const userId = session.user.id
        const { amount, payment_method, payment_details } = await req.json()

        console.log('🟦 [WITHDRAWAL-REQUEST] Request from user:', userId)
        console.log('💵 [WITHDRAWAL-REQUEST] Amount:', amount, 'Method:', payment_method)

        // Validate input
        if (!amount || amount < 50) {
            return NextResponse.json({ 
                error: 'Minimum withdrawal amount is $50.00' 
            }, { status: 400 })
        }

        if (!payment_method || !['paypal', 'usdt_trc20'].includes(payment_method)) {
            return NextResponse.json({ 
                error: 'Invalid payment method. Use paypal or usdt_trc20' 
            }, { status: 400 })
        }

        if (!payment_details) {
            return NextResponse.json({ 
                error: 'Payment details are required' 
            }, { status: 400 })
        }

        // Validate payment details based on method
        if (payment_method === 'paypal' && !payment_details.email) {
            return NextResponse.json({ 
                error: 'PayPal email is required' 
            }, { status: 400 })
        }

        if (payment_method === 'usdt_trc20' && !payment_details.wallet_address) {
            return NextResponse.json({ 
                error: 'USDT wallet address is required' 
            }, { status: 400 })
        }

        // Get user's total earnings
        const { data: earningsData, error: earningsError } = await supabase
            .from('model_creator_earnings')
            .select('total_earnings')
            .eq('creator_id', userId)

        if (earningsError) {
            console.error('🔴 [WITHDRAWAL-REQUEST] Error fetching earnings:', earningsError)
            return NextResponse.json({ 
                error: 'Failed to fetch earnings data' 
            }, { status: 500 })
        }

        const totalEarnings = earningsData?.reduce((sum, record) => 
            sum + parseFloat(record.total_earnings || '0'), 0
        ) || 0

        console.log('💰 [WITHDRAWAL-REQUEST] User total earnings:', totalEarnings)

        // Check if user has sufficient balance
        if (amount > totalEarnings) {
            return NextResponse.json({ 
                error: 'Insufficient balance',
                available: totalEarnings,
                requested: amount
            }, { status: 400 })
        }

        // Check for pending withdrawals
        const { data: pendingRequests, error: pendingError } = await supabase
            .from('withdrawal_requests')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'pending')

        if (pendingError) {
            console.error('🔴 [WITHDRAWAL-REQUEST] Error checking pending requests:', pendingError)
        }

        if (pendingRequests && pendingRequests.length > 0) {
            return NextResponse.json({ 
                error: 'You already have a pending withdrawal request. Please wait for it to be processed.' 
            }, { status: 400 })
        }

        // Create withdrawal request
        const { data: withdrawalRequest, error: insertError } = await supabase
            .from('withdrawal_requests')
            .insert({
                user_id: userId,
                amount: amount,
                payment_method: payment_method,
                payment_details: payment_details,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (insertError) {
            console.error('🔴 [WITHDRAWAL-REQUEST] Error creating request:', insertError)
            return NextResponse.json({ 
                error: 'Failed to create withdrawal request',
                details: insertError.message
            }, { status: 500 })
        }

        console.log('✅ [WITHDRAWAL-REQUEST] Request created successfully:', withdrawalRequest.id)

        // TODO: Send email notification to admin

        return NextResponse.json({ 
            success: true,
            message: 'Withdrawal request submitted successfully',
            request: {
                id: withdrawalRequest.id,
                amount: withdrawalRequest.amount,
                payment_method: withdrawalRequest.payment_method,
                status: withdrawalRequest.status,
                created_at: withdrawalRequest.created_at
            }
        })

    } catch (error) {
        console.error('🔴 [WITHDRAWAL-REQUEST] Unexpected error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

// GET endpoint to fetch user's withdrawal requests
export async function GET(req: Request) {
    const supabase = createClient()

    try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()

        if (authError || !session) {
            return NextResponse.json({ 
                error: 'Unauthorized' 
            }, { status: 401 })
        }

        const userId = session.user.id

        // Fetch user's withdrawal requests
        const { data: requests, error: requestsError } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (requestsError) {
            console.error('🔴 [WITHDRAWAL-REQUEST] Error fetching requests:', requestsError)
            return NextResponse.json({ 
                error: 'Failed to fetch withdrawal requests' 
            }, { status: 500 })
        }

        return NextResponse.json({ 
            success: true,
            requests: requests || []
        })

    } catch (error) {
        console.error('🔴 [WITHDRAWAL-REQUEST] Unexpected error:', error)
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 })
    }
}
