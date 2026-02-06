import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export const dynamic = 'force-dynamic' // Ensure this route is not cached

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization Check
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    // Require CRON_SECRET to be set and matched
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createAdminClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    // 2. Get recent paid transactions (last 50 to cover recent history)
    const { data: transactions, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .in('status', ['paid', 'completed'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (txError) {
      console.error('Error fetching transactions:', txError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    let fixedCount = 0
    let skippedCount = 0
    let errorCount = 0
    const fixedIds = []

    for (const tx of transactions) {
      const paymentId = tx.id
      const initialUserId = tx.user_id
      let amount = tx.amount

      // Fallback amount from metadata if main amount is 0/null
      if (!amount && tx.metadata && tx.metadata.price) {
          amount = parseFloat(tx.metadata.price)
      }

      if (!amount || amount <= 0) {
          skippedCount++
          continue
      }

      // Check if commission exists
      const { data: bonusTx, error: bonusError } = await supabase
        .from('bonus_transactions')
        .select('id')
        .eq('payment_id', paymentId)
        .maybeSingle()

      if (bonusError) {
        console.error(`Error checking bonus for tx ${paymentId}:`, bonusError)
        errorCount++
        continue
      }

      if (bonusTx) {
        skippedCount++
        continue
      }

      console.log(`🔧 Transaction ${paymentId}: Missing commission. Processing manually...`)

      // Process commission manually (up to 3 levels)
      try {
          let currentUserId = initialUserId
          let level = 1
          let distributed = false

          while (level <= 3) {
              // Get referrer
              const { data: profile, error: profileError } = await supabase
                  .from('user_profiles')
                  .select('referrer_id')
                  .eq('user_id', currentUserId)
                  .single()
              
              if (profileError || !profile || !profile.referrer_id) {
                  break
              }

              const referrerId = profile.referrer_id
              
              // Calculate commission
              let rate = 0
              if (level === 1) rate = 0.50
              else if (level === 2) rate = 0.05
              else if (level === 3) rate = 0.05

              const commissionAmount = amount * rate

              // Update bonus wallet
              const { data: wallet } = await supabase.from('bonus_wallets').select('*').eq('user_id', referrerId).single()
              
              if (wallet) {
                  await supabase.from('bonus_wallets').update({
                      balance: wallet.balance + commissionAmount,
                      lifetime_earnings: wallet.lifetime_earnings + commissionAmount,
                      updated_at: new Date().toISOString()
                  }).eq('user_id', referrerId)
              } else {
                  await supabase.from('bonus_wallets').insert({
                      user_id: referrerId,
                      balance: commissionAmount,
                      lifetime_earnings: commissionAmount,
                      updated_at: new Date().toISOString()
                  })
              }

              // Insert transaction
              const { error: insertError } = await supabase.from('bonus_transactions').insert({
                  user_id: referrerId,
                  transaction_type: `commission_level${level}`,
                  amount: commissionAmount,
                  from_user_id: initialUserId,
                  payment_id: paymentId,
                  level: level,
                  description: `Level ${level} commission from referral purchase (Auto Fix)`,
                  status: 'completed'
              })

              if (!insertError) {
                  distributed = true
              }

              // Move up
              currentUserId = referrerId
              level++
          }

          if (distributed) {
            fixedCount++
            fixedIds.push(paymentId)
          } else {
            skippedCount++
          }

      } catch (e) {
        console.error(`❌ Exception processing commission for tx ${paymentId}:`, e)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        scanned: transactions.length,
        fixed: fixedCount,
        skipped: skippedCount,
        errors: errorCount,
        fixedIds
      }
    })

  } catch (error: any) {
    console.error("Error in cron job:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
