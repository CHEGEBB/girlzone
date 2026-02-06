import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // Get the current user (the one making the payment)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { transactionId, paymentAmount } = body

    if (!transactionId || !paymentAmount) {
      return NextResponse.json(
        { error: "Transaction ID and payment amount are required" },
        { status: 400 }
      )
    }

    // Get affiliate code from cookie
    const cookieStore = await cookies()
    const affiliateCode = cookieStore.get('affiliate_code')?.value

    if (!affiliateCode) {
      // No affiliate cookie, no commission to track
      return NextResponse.json({
        success: true,
        message: "No affiliate code found",
      })
    }

    // Find the affiliate
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, user_id, status')
      .eq('affiliate_code', affiliateCode)
      .eq('status', 'approved')
      .single()

    if (affiliateError || !affiliate) {
      console.error("Affiliate not found or not approved:", affiliateError)
      return NextResponse.json({
        success: true,
        message: "Affiliate not found",
      })
    }

    // Check if conversion already tracked for this transaction
    const { data: existingCommission } = await supabase
      .from('affiliate_commissions')
      .select('id')
      .eq('transaction_id', transactionId)
      .maybeSingle()

    if (existingCommission) {
      return NextResponse.json({
        success: true,
        message: "Conversion already tracked",
      })
    }

    // Calculate 50% commission
    const commissionAmount = paymentAmount * 0.5

    // Create commission record
    const { error: commissionError } = await supabase
      .from('affiliate_commissions')
      .insert({
        affiliate_id: affiliate.id,
        transaction_id: transactionId,
        amount: commissionAmount,
        status: 'pending',
        created_at: new Date().toISOString(),
      })

    if (commissionError) {
      console.error("Error creating commission record:", commissionError)
      return NextResponse.json(
        { error: "Failed to create commission record" },
        { status: 500 }
      )
    }

    // Find shared chats from this affiliate and increment conversion count
    // Using direct query since RPC function may not exist yet
    const { error: conversionError } = await supabase
      .from('shared_chats')
      .select('id, conversion_count')
      .eq('user_id', affiliate.user_id)
      .then(async ({ data, error }) => {
        if (error || !data) return { error }
        
        // Update each shared chat
        for (const chat of data) {
          await supabase
            .from('shared_chats')
            .update({ conversion_count: chat.conversion_count + 1 })
            .eq('id', chat.id)
        }
        
        return { error: null }
      })

    if (conversionError) {
      console.error("Error updating conversion count:", conversionError)
      // Non-critical error, continue
    }

    // Credit affiliate's earnings (add to model_creator_earnings or similar)
    const { data: existingEarnings } = await supabase
      .from('model_creator_earnings')
      .select('*')
      .eq('creator_id', affiliate.user_id)
      .maybeSingle()

    if (existingEarnings) {
      // Update existing earnings
      await supabase
        .from('model_creator_earnings')
        .update({
          total_earnings: existingEarnings.total_earnings + commissionAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('creator_id', affiliate.user_id)
    } else {
      // Create new earnings record
      await supabase
        .from('model_creator_earnings')
        .insert({
          creator_id: affiliate.user_id,
          total_earnings: commissionAmount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
    }

    // Clear the affiliate cookie after successful conversion
    cookieStore.delete('affiliate_code')

    return NextResponse.json({
      success: true,
      message: "Conversion tracked successfully",
      commissionAmount,
      affiliateId: affiliate.id,
    })
  } catch (error) {
    console.error("Error in track-affiliate-conversion API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
