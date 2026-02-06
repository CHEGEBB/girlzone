import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { getStripeInstance } from "@/lib/stripe-utils"

async function fulfillOrder(session: any) {
  try {
    // Use admin client to avoid cookie issues
    const supabaseAdmin = await createAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to initialize Supabase admin client")
    }

    const userId = session.metadata.userId

    console.log(`🎯 Fulfilling order for user: ${userId}, session: ${session.id}`);
    console.log(`📦 Session metadata:`, session.metadata);

    // DUPLICATE DETECTION: Check if this payment was already processed
    const { data: existingTransaction, error: checkError } = await supabaseAdmin
      .from("payment_transactions")
      .select("id, status")
      .eq("stripe_session_id", session.id)
      .maybeSingle()

    if (checkError) {
      console.error("❌ Error checking existing transaction:", checkError)
    }

    // If transaction already marked as paid, skip processing
    if (existingTransaction && existingTransaction.status === "paid") {
      console.log(`⏭️ Payment already processed for session ${session.id} - skipping duplicate processing`)
      return
    }

    // Update transaction record and get the transaction ID
    let paymentTransactionId = null;
    
    // First try to update existing transaction
    const { data: transactionUpdate, error: transactionUpdateError } = await supabaseAdmin
      .from("payment_transactions")
      .update({
        status: "paid",
        stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        metadata: session.metadata,
      })
      .eq("stripe_session_id", session.id)
      .select("id")
      .maybeSingle()

    if (transactionUpdateError) {
      console.error("❌ Error updating transaction:", transactionUpdateError)
    }

    if (transactionUpdate) {
      paymentTransactionId = transactionUpdate.id
    } else {
      // If no transaction found to update, create a new one (common for token purchases)
      console.log(`ℹ️ Payment transaction not found for session ${session.id}, creating new record...`);
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from("payment_transactions")
        .insert({
          user_id: userId,
          stripe_session_id: session.id,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
          amount: session.amount_total / 100, // Convert cents to dollars
          currency: session.currency || 'usd',
          status: "paid",
          metadata: session.metadata,
          created_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (insertError) {
        // Check for duplicate key error (race condition)
        if (insertError.code === '23505') {
          console.log(`⚠️ Transaction already created by another process for session ${session.id}`);
          // Try to fetch it again
          const { data: existingTx } = await supabaseAdmin
            .from("payment_transactions")
            .select("id")
            .eq("stripe_session_id", session.id)
            .single();
          paymentTransactionId = existingTx?.id;
        } else {
          console.error("❌ Error creating payment transaction:", insertError);
        }
      } else {
        paymentTransactionId = insertedData?.id;
        console.log(`✅ Created new payment transaction: ${paymentTransactionId}`);
      }
    }

    // Add tokens if it was a token purchase
    const tokensToAdd = parseInt(session.metadata.tokens || "0", 10)
    if (tokensToAdd > 0) {
      // Fetch current balance
      const { data: currentTokens, error: fetchError } = await supabaseAdmin
        .from("user_tokens")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle()

      if (fetchError) {
        console.error("Error fetching current token balance:", fetchError)
        // Decide how to handle this error: throw, log, or default to 0
      }

      const newBalance = (currentTokens?.balance || 0) + tokensToAdd

      // Upsert the new balance
      const { error: upsertError } = await supabaseAdmin
        .from("user_tokens")
        .upsert({ user_id: userId, balance: newBalance }, { onConflict: "user_id" })

      if (upsertError) {
        console.error("Error updating user tokens:", upsertError)
        // Decide how to handle this error
      }
      const price = session.amount_total / 100; // Stripe amount is in cents
      console.log("Attempting to insert revenue transaction with amount:", price);

      if (price > 0) {
        const { error: revenueError } = await supabaseAdmin
          .from("revenue_transactions")
          .insert({ amount: price });

        if (revenueError) {
          console.error("Error inserting into revenue_transactions:", revenueError);
        } else {
          console.log("Successfully inserted into revenue_transactions with amount:", price);
        }
      } else {
        console.error("Invalid price for revenue transaction:", price);
      }

      // Log the transaction in token_transactions
      const { error: tokenTxError } = await supabaseAdmin
        .from("token_transactions")
        .insert({
          user_id: userId,
          amount: tokensToAdd,
          type: "recharge",
          description: `Purchased ${tokensToAdd} tokens`,
          created_at: new Date().toISOString()
        });

      if (tokenTxError) {
        console.error("❌ Error logging token transaction:", tokenTxError);
      } else {
        console.log("✅ Token transaction logged successfully");
      }

      // Track affiliate commission for token purchase
      if (paymentTransactionId) {
        console.log(`💰 Tracking affiliate commission for token purchase: userId=${userId}, amount=$${price}, transactionId=${paymentTransactionId}`);
        try {
          const { data: commissionData, error: commissionError } = await supabaseAdmin
            .rpc('track_multilevel_commission', {
              p_buyer_id: userId,
              p_payment_amount: price,
              p_payment_id: paymentTransactionId
            });

          if (commissionError) {
            console.error("❌ Error tracking affiliate commission:", commissionError);
          } else if (commissionData && commissionData.length > 0) {
            console.log(`✅ Successfully distributed commissions to ${commissionData.length} level(s):`, commissionData);
          } else {
            console.log("ℹ️ No referrer found for this user - no commissions distributed");
          }
        } catch (commissionException) {
          console.error("❌ Exception tracking affiliate commission:", commissionException);
        }
      }
    }

    // Update premium status if it was a plan purchase
    if (session.metadata.planId && session.metadata.planDuration && session.metadata.type !== "token_purchase") {
      const planDurationMonths = parseInt(session.metadata.planDuration, 10) || 1
      const now = new Date()
      const expiresAt = new Date(now.setMonth(now.getMonth() + planDurationMonths)).toISOString()

      console.log(`💎 Creating premium profile: userId=${userId}, planId=${session.metadata.planId}, duration=${planDurationMonths} months, expires=${expiresAt}`);

      // Try multiple approaches to create premium status
      let premiumCreated = false;

      // Method 1: Try premium_profiles table
      try {
        const { data: premiumData, error: premiumError } = await supabaseAdmin
          .from("premium_profiles")
          .upsert([{
            user_id: userId,
            expires_at: expiresAt,
            plan_id: session.metadata.planId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }], { onConflict: "user_id" });

        if (premiumError) {
          console.error("❌ Error creating premium profile:", JSON.stringify(premiumError, null, 2));
        } else {
          console.log("✅ Successfully created premium profile:", premiumData);
          premiumCreated = true;
        }
      } catch (profileError) {
        console.error("❌ Exception in premium_profiles:", profileError);
      }

      // Method 2: Record in payment_transactions with duplicate prevention
      // The database will reject duplicates if stripe_session_id has a unique constraint
      let newPaymentTransactionId = null;
      try {
        const { data: transactionData, error: transactionError } = await supabaseAdmin
          .from("payment_transactions")
          .insert({
            user_id: userId,
            stripe_session_id: session.id,
            plan_id: session.metadata.planId,
            plan_name: session.metadata.planName,
            plan_duration: parseInt(session.metadata.planDuration, 10) || 1,
            amount: parseFloat(session.metadata.price || "0"),
            status: "completed",
            created_at: new Date().toISOString(),
            metadata: session.metadata
          })
          .select("id")
          .single();

        if (transactionError) {
          // Check if this is a duplicate key error (23505 is PostgreSQL's unique violation code)
          if (transactionError.code === '23505') {
            console.log(`⏭️ Subscription payment already processed for session ${session.id} - duplicate detected by database`)
            return // Exit early - this is a duplicate request
          }
          console.error("❌ Error recording payment transaction:", JSON.stringify(transactionError, null, 2));
        } else {
          console.log("✅ Successfully recorded payment transaction:", transactionData);
          newPaymentTransactionId = transactionData?.id;
          premiumCreated = true; // This is sufficient for premium status detection
        }
      } catch (transactionError) {
        console.error("❌ Exception in payment_transactions:", transactionError);
        return // Exit on exception to prevent double processing
      }

      // Track affiliate commission for premium membership purchase
      const membershipPrice = parseFloat(session.metadata.price || "0");
      const commissionPaymentId = newPaymentTransactionId || paymentTransactionId;
      
      if (membershipPrice > 0 && commissionPaymentId) {
        console.log(`💰 Tracking affiliate commission for membership purchase: userId=${userId}, amount=$${membershipPrice}, transactionId=${commissionPaymentId}`);
        try {
          const { data: commissionData, error: commissionError } = await supabaseAdmin
            .rpc('track_multilevel_commission', {
              p_buyer_id: userId,
              p_payment_amount: membershipPrice,
              p_payment_id: commissionPaymentId
            });

          if (commissionError) {
            console.error("❌ Error tracking affiliate commission:", commissionError);
          } else if (commissionData && commissionData.length > 0) {
            console.log(`✅ Successfully distributed commissions to ${commissionData.length} level(s):`, commissionData);
          } else {
            console.log("ℹ️ No referrer found for this user - no commissions distributed");
          }
        } catch (commissionException) {
          console.error("❌ Exception tracking affiliate commission:", commissionException);
        }
      }

      // Grant immediate tokens for new subscription (same method as token purchase)
      console.log(`🎁 Granting tokens to user ${userId} for new subscription`);
      try {
        let subscriptionTokens = 100; // Default fallback

        // Fetch plan details to get configured token amount
        if (session.metadata.planId) {
          const { data: planData, error: planError } = await supabaseAdmin
            .from("subscription_plans")
            .select("monthly_bonus_tokens")
            .eq("id", session.metadata.planId)
            .single();
            
          if (!planError && planData && typeof planData.monthly_bonus_tokens === 'number') {
            subscriptionTokens = planData.monthly_bonus_tokens;
            console.log(`Using plan-specific bonus: ${subscriptionTokens} tokens`);
          } else {
            console.log(`Using default bonus: ${subscriptionTokens} tokens (Plan lookup failed or no bonus set)`);
          }
        }
        
        // Fetch current balance
        const { data: currentTokens, error: fetchError } = await supabaseAdmin
          .from("user_tokens")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();

        if (fetchError) {
          console.error("❌ Error fetching current token balance:", fetchError);
        }

        const newBalance = (currentTokens?.balance || 0) + subscriptionTokens;

        // Upsert the new balance
        const { error: upsertError } = await supabaseAdmin
          .from("user_tokens")
          .upsert({ user_id: userId, balance: newBalance }, { onConflict: "user_id" });

        if (upsertError) {
          console.error("❌ Error updating user tokens:", upsertError);
        } else {
          console.log(`✅ Successfully added ${subscriptionTokens} tokens to user ${userId}. New balance: ${newBalance}`);
          
          // Record the token transaction
          const { error: transactionError } = await supabaseAdmin
            .from("token_transactions")
            .insert({
              user_id: userId,
              amount: subscriptionTokens,
              type: "subscription_grant",
              description: `Welcome bonus: ${subscriptionTokens} tokens for new subscription`,
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

      // Method 3: Create a simple premium record as last resort
      if (!premiumCreated) {
        console.log("🔄 Creating simple premium record as fallback...");
        try {
          // Create a simple table entry that our status API can read
          const { error: simpleError } = await supabaseAdmin
            .from("user_premium_status")
            .upsert([{
              user_id: userId,
              is_premium: true,
              expires_at: expiresAt,
              plan_name: session.metadata.planName,
              created_at: new Date().toISOString()
            }], { onConflict: "user_id" });

          if (simpleError) {
            console.error("❌ Simple premium record also failed:", JSON.stringify(simpleError, null, 2));
          } else {
            console.log("✅ Created simple premium record");
          }
        } catch (simpleError) {
          console.error("❌ Exception in simple premium record:", simpleError);
        }
      }
    }
  } catch (error) {
    console.error("Error fulfilling order:", error)
    // Handle error appropriately
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("session_id")
    if (!sessionId) {
      return NextResponse.json({ error: "No session ID provided" }, { status: 400 })
    }

    const stripe = await getStripeInstance()
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === "paid") {
      await fulfillOrder(session)
    }

    return NextResponse.json({ isPaid: session.payment_status === "paid" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: "No session ID provided" }, { status: 400 })
    }

    const stripe = await getStripeInstance()
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === "paid") {
      await fulfillOrder(session)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Payment not successful" }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
