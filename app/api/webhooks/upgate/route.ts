import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Upgate webhook received:", body)

    const supabase = await createAdminClient()
    
    if (!supabase) {
      console.error("Failed to create admin client")
      return NextResponse.json({ success: false, error: "Configuration error" }, { status: 500 })
    }

    // Extract transaction data from webhook
    const {
      transaction_id,
      merchant_payment_id,
      merchant_customer_id,
      status,
      amount,
      currency_code,
      response_code,
    } = body

    // Verify the webhook has required data
    if (!merchant_payment_id || !merchant_customer_id) {
      console.error("Invalid webhook data: missing required fields")
      return NextResponse.json({ success: false, error: "Invalid webhook data" }, { status: 400 })
    }

    // Get the session from database
    const { data: session, error: sessionError } = await supabase
      .from("upgate_sessions")
      .select("*")
      .eq("merchant_payment_id", merchant_payment_id)
      .single()

    if (sessionError || !session) {
      console.error("Session not found:", merchant_payment_id, sessionError)
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 })
    }

    // Check if payment was successful (response_code 1000 indicates success in Upgate)
    const isSuccess = response_code === "1000" || status === "COMPLETED"

    if (!isSuccess) {
      // Update session as failed
      await supabase
        .from("upgate_sessions")
        .update({
          status: "failed",
          transaction_id,
          updated_at: new Date().toISOString(),
        })
        .eq("merchant_payment_id", merchant_payment_id)

      return NextResponse.json({ success: true, message: "Payment failed" })
    }

    // Check if already processed
    if (session.status === "completed") {
      console.log("⏭️ Payment already processed:", merchant_payment_id, "- skipping duplicate processing")
      return NextResponse.json({ success: true, message: "Already processed" })
    }

    // Update session as completed FIRST to prevent race conditions
    const { error: updateError } = await supabase
      .from("upgate_sessions")
      .update({
        status: "completed",
        transaction_id,
        updated_at: new Date().toISOString(),
      })
      .eq("merchant_payment_id", merchant_payment_id)
      .eq("status", "pending") // Only update if still pending (prevents race condition)

    // If update affected 0 rows, it means another request already processed this
    if (updateError) {
      console.error("❌ Error updating session:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update session" }, { status: 500 })
    }

    const metadata = session.metadata || {}
    const userId = session.user_id

    // Process payment based on type
    if (metadata.type === "token_purchase") {
      // Handle token purchase
      const tokens = metadata.tokens || 0

      if (tokens > 0) {
        // Add tokens to user's balance
        const { data: profile } = await supabase
          .from("profiles")
          .select("tokens")
          .eq("id", userId)
          .single()

        const currentTokens = profile?.tokens || 0
        const newTokens = currentTokens + tokens

        await supabase.from("profiles").update({ tokens: newTokens }).eq("id", userId)

        // Record transaction
        await supabase.from("transactions").insert({
          user_id: userId,
          type: "purchase",
          amount: session.amount,
          tokens: tokens,
          payment_gateway: "upgate",
          payment_id: transaction_id,
          status: "completed",
          created_at: new Date().toISOString(),
        })

        console.log(`Added ${tokens} tokens to user ${userId}`)
      }
    } else if (metadata.type === "subscription_purchase") {
      // Handle subscription purchase
      const planDuration = metadata.planDuration || 1

      // Calculate expiry date
      const now = new Date()
      const expiryDate = new Date(now.setMonth(now.getMonth() + planDuration))

      // Update user's premium status
      await supabase
        .from("profiles")
        .update({
          is_premium: true,
          premium_expires_at: expiryDate.toISOString(),
        })
        .eq("id", userId)

      // Record transaction
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "subscription",
        amount: session.amount,
        payment_gateway: "upgate",
        payment_id: transaction_id,
        status: "completed",
        metadata: {
          plan_id: session.plan_id,
          duration: planDuration,
          expires_at: expiryDate.toISOString(),
        },
        created_at: new Date().toISOString(),
      })

      console.log(`Activated premium subscription for user ${userId} until ${expiryDate}`)

      // Grant immediate 100 tokens for new subscription (same method as token purchase)
      console.log(`🎁 Granting 100 tokens to user ${userId} for new Upgate subscription`);
      try {
        const subscriptionTokens = 100;
        
        // Fetch current balance from user_tokens
        const { data: currentTokens, error: fetchError } = await supabase
          .from("user_tokens")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (fetchError) {
          console.error("❌ Error fetching current token balance:", fetchError);
        }

        const newBalance = (currentTokens?.balance || 0) + subscriptionTokens;

        // Upsert the new balance
        const { error: upsertError } = await supabase
          .from("user_tokens")
          .upsert({ user_id: userId, balance: newBalance }, { onConflict: "user_id" });

        if (upsertError) {
          console.error("❌ Error updating user tokens:", upsertError);
        } else {
          console.log(`✅ Successfully added ${subscriptionTokens} tokens to user ${userId}. New balance: ${newBalance}`);
          
          // Record the token transaction
          const { error: transactionError } = await supabase
            .from("token_transactions")
            .insert({
              user_id: userId,
              amount: subscriptionTokens,
              type: "subscription_grant",
              description: "Welcome bonus: 100 tokens for new Upgate subscription",
              created_at: new Date().toISOString()
            });

          if (transactionError) {
            console.error("❌ Error recording token transaction:", transactionError);
          } else {
            console.log("✅ Token transaction recorded successfully");
          }
        }
      } catch (tokenError) {
        console.error(`❌ Error granting subscription tokens to user ${userId}:`, tokenError);
        // Don't fail the payment if token grant fails
      }
    }

    // Check if there's an affiliate referral to process
    const { data: referral } = await supabase
      .from("affiliate_referrals")
      .select("*")
      .eq("referred_user_id", userId)
      .eq("status", "pending")
      .single()

    if (referral) {
      // Calculate commission (10% of purchase amount)
      const commission = session.amount * 0.1

      // Update referral status
      await supabase
        .from("affiliate_referrals")
        .update({
          status: "completed",
          commission_amount: commission,
        })
        .eq("id", referral.id)

      // Add commission to affiliate's balance
      const { data: affiliateProfile } = await supabase
        .from("profiles")
        .select("affiliate_earnings")
        .eq("id", referral.referrer_user_id)
        .single()

      const currentEarnings = affiliateProfile?.affiliate_earnings || 0
      await supabase
        .from("profiles")
        .update({ affiliate_earnings: currentEarnings + commission })
        .eq("id", referral.referrer_user_id)

      console.log(`Added affiliate commission of ${commission} to user ${referral.referrer_user_id}`)
    }

    return NextResponse.json({ success: true, message: "Payment processed successfully" })
  } catch (error: any) {
    console.error("Error processing Upgate webhook:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ success: true, message: "Upgate webhook endpoint is active" })
}
