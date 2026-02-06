import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"
import { getStripeInstance } from "@/lib/stripe-utils"

export async function POST(request: NextRequest) {
  try {
    const { planId, userId, email, successUrl, cancelUrl, metadata } = await request.json()

    if (!planId) {
      return NextResponse.json({ success: false, error: "Plan ID is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Check if monetization is enabled (key/value)
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
    
    // Allow purchases even if monetization is disabled (requested by user)
    // if (!monetizationEnabled) {
    //   return NextResponse.json({ 
    //     success: false, 
    //     error: "Monetization is currently disabled. Purchases are not available." 
    //   }, { status: 403 })
    // }

    // Check which payment gateway is active
    const { data: gatewayData } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "payment_gateway")
      .maybeSingle()

    const paymentGateway = gatewayData?.value || "stripe"

    // Route to appropriate payment gateway
    if (paymentGateway === "upgate") {
      // Forward to Upgate checkout endpoint
      try {
        const upgateResponse = await fetch(`${request.nextUrl.origin}/api/create-upgate-checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ planId, userId, email, successUrl, cancelUrl, metadata }),
        })

        // Check if response has content
        const text = await upgateResponse.text()
        if (!text) {
          return NextResponse.json(
            { success: false, error: "Empty response from Upgate" },
            { status: 500 }
          )
        }

        const upgateData = JSON.parse(text)
        return NextResponse.json(upgateData, { status: upgateResponse.status })
      } catch (error) {
        console.error("Error forwarding to Upgate:", error)
        return NextResponse.json(
          { success: false, error: error instanceof Error ? error.message : "Failed to process Upgate payment" },
          { status: 500 }
        )
      }
    }

    // Default to Stripe (existing logic continues below)

    // Get authenticated user if userId not provided
    let authenticatedUserId = userId
    let userEmail = email


    if (!authenticatedUserId) {
      const cookieStore = await cookies();
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return NextResponse.json({ success: false, error: "not_authenticated" }, { status: 401 });
      }

      authenticatedUserId = session.user.id;
      userEmail = session.user.email;
    }

    // Check if this is a token purchase
    const isTokenPurchase = planId.startsWith("token_") || (metadata && metadata.type === "token_purchase")

    let productName, productDescription, priceAmount, productMetadata

    if (isTokenPurchase) {
      // Handle token purchase
      const tokenAmount = metadata?.tokens || Number.parseInt(planId.split("_")[1]) || 0
      const price = metadata?.price || 0

      if (tokenAmount <= 0 || price <= 0) {
        return NextResponse.json({ success: false, error: "Invalid token package" }, { status: 400 })
      }

      productName = `${tokenAmount} Tokens`
      productDescription = `Purchase of ${tokenAmount} tokens`
      priceAmount = price
      productMetadata = {
        type: "token_purchase",
        tokens: tokenAmount.toString(),
        userId: authenticatedUserId,
        price: price.toString(),
      }
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

      // Calculate the price to use (discounted_price if available, otherwise original_price)
      const monthlyPrice = plan.discounted_price !== null ? plan.discounted_price : plan.original_price
      
      // Calculate total price based on duration
      priceAmount = monthlyPrice * plan.duration
      
      productName = plan.name
      productDescription = plan.description || `${plan.duration} month subscription`
      productMetadata = {
        type: "premium_purchase",
        userId: authenticatedUserId,
        planId: planId,
        planName: plan.name,
        planDuration: plan.duration.toString(),
        price: priceAmount.toString(),
      }
    }

    // Validate that we have a valid price
    if (typeof priceAmount !== "number" || isNaN(priceAmount)) {
      console.error("Invalid price value:", priceAmount)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid price configuration",
        },
        { status: 400 },
      )
    }

    const stripe = await getStripeInstance()
    if (!stripe) {
      return NextResponse.json({ success: false, error: "Stripe is not configured" }, { status: 500 })
    }

    // Create checkout session with validated price
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: Math.round(priceAmount * 100), // Convert to cents and ensure it's an integer
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${request.nextUrl.origin}/premium/success?session_id={CHECKOUT_SESSION_ID}&user_id=${authenticatedUserId}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/premium?canceled=true`,
      customer_email: userEmail,
      metadata: {
        ...productMetadata,
        ...(metadata || {}),
      },
    })

    return NextResponse.json({ success: true, sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
