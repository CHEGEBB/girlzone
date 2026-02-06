import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"
import { createUpgateCheckout } from "@/lib/upgate-utils"

export async function POST(request: NextRequest) {
  try {
    const { planId, userId, email, successUrl, cancelUrl, metadata } = await request.json()

    console.log("🔵 [CHECKOUT DEBUG] Upgate checkout initiated:", {
      planId,
      userId,
      email,
      hasMetadata: !!metadata,
    })

    if (!planId) {
      console.error("🔴 [CHECKOUT ERROR] Plan ID is missing")
      return NextResponse.json({ success: false, error: "Plan ID is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Check if monetization is enabled
    const { data: setting, error: settingsError } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "monetization_enabled")
      .maybeSingle()

    if (settingsError) {
      console.error("Error checking monetization status:", settingsError)
    }

    let monetizationEnabled = true
    const raw = setting?.value
    if (typeof raw === "string") monetizationEnabled = raw.toLowerCase() !== "false"
    else if (typeof raw === "boolean") monetizationEnabled = raw !== false
    
    if (!monetizationEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "Monetization is currently disabled. Purchases are not available.",
        },
        { status: 403 }
      )
    }

    // Get authenticated user if userId not provided
    let authenticatedUserId = userId
    let userEmail = email

    if (!authenticatedUserId) {
      const cookieStore = await cookies()
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        return NextResponse.json({ success: false, error: "not_authenticated" }, { status: 401 })
      }

      authenticatedUserId = session.user.id
      userEmail = session.user.email
    }

    // Check if this is a token purchase
    const isTokenPurchase = planId.startsWith("token_") || (metadata && metadata.type === "token_purchase")

    let productName, productDescription, priceAmount, merchantPaymentId

    if (isTokenPurchase) {
      // Handle token purchase
      const tokenAmount = metadata?.tokens || Number.parseInt(planId.split("_")[1]) || 0
      const price = metadata?.price || 0

      if (tokenAmount <= 0 || price <= 0) {
        return NextResponse.json({ success: false, error: "Invalid token package" }, { status: 400 })
      }

      productName = `${tokenAmount} Tokens`
      productDescription = `Purchase of ${tokenAmount} tokens for image generation`
      priceAmount = price
      merchantPaymentId = `TOKEN_${authenticatedUserId}_${Date.now()}`
    } else {
      // Handle subscription plan
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .single()

      if (planError || !plan) {
        return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 })
      }

      // Calculate the price to use
      priceAmount = plan.discounted_price !== null ? plan.discounted_price : plan.original_price
      
      // For subscriptions, multiply by duration to get total price
      const totalPrice = priceAmount * plan.duration
      
      productName = plan.name
      productDescription = plan.description || `${plan.duration} month premium subscription`
      priceAmount = totalPrice
      merchantPaymentId = `SUB_${authenticatedUserId}_${Date.now()}`
    }

    // Validate price
    if (typeof priceAmount !== "number" || isNaN(priceAmount) || priceAmount <= 0) {
      console.error("Invalid price value:", priceAmount)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid price configuration",
        },
        { status: 400 }
      )
    }

    // Create Upgate checkout session
    const checkoutResult = await createUpgateCheckout({
      merchant_payment_id: merchantPaymentId,
      methods: ["CARD", "MBWAY"], // Support card and MBWAY payments
      type: "SALE",
      amount: priceAmount,
      currency_code: "EUR", // Using EUR as per Upgate API spec
      merchant_customer_id: authenticatedUserId,
      success_url:
        successUrl || `${request.nextUrl.origin}/premium/success?session_id=${merchantPaymentId}&user_id=${authenticatedUserId}`,
      failure_url: cancelUrl || `${request.nextUrl.origin}/premium?canceled=true`,
      products: [
        {
          type: "SALE",
          name: productName,
          description: productDescription,
          price: priceAmount,
        },
      ],
    })

    if (!checkoutResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: checkoutResult.error || "Failed to create checkout session",
        },
        { status: 500 }
      )
    }

    // Store payment session in database for webhook processing
    // Use service role client to bypass RLS
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

      const { error: insertError } = await supabaseAdmin.from("upgate_sessions").insert({
        session_id: checkoutResult.checkout_id,
        merchant_payment_id: merchantPaymentId,
        user_id: authenticatedUserId,
        plan_id: planId,
        amount: priceAmount,
        currency: "EUR",
        status: "pending",
        metadata: {
          type: isTokenPurchase ? "token_purchase" : "subscription_purchase",
          ...metadata,
        },
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("🔴 [CHECKOUT ERROR] Error storing Upgate session:", insertError)
        console.log("Note: Make sure to run the database migration: sql/create_upgate_sessions_table.sql")
        // Don't fail the request, just log the error
      } else {
        console.log("✅ [CHECKOUT SUCCESS] Upgate session stored in database")
      }
    } catch (dbError) {
      console.error("🔴 [CHECKOUT ERROR] Database error:", dbError)
      // Continue anyway - the webhook can still process the payment
    }

    return NextResponse.json({
      success: true,
      sessionId: checkoutResult.checkout_id,
      url: checkoutResult.checkout_url,
    })
  } catch (error: any) {
    console.error("Error creating Upgate checkout session:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
