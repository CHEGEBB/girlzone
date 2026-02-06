import { createClient } from "@/lib/supabase-server"

/**
 * Upgate API Configuration
 * Handles Upgate payment gateway integration
 */

export interface UpgateCheckoutData {
  merchant_payment_id: string
  methods: string[]
  type: "SALE"
  amount: number
  currency_code: string
  merchant_customer_id: string
  success_url: string
  failure_url: string
  products: Array<{
    type: "SALE"
    name: string
    description: string
    price: number
  }>
}

export interface UpgateCheckoutResponse {
  success: boolean
  checkout_url?: string
  checkout_id?: string
  error?: string
}

/**
 * Get Upgate API configuration from environment or database
 */
export async function getUpgateConfig() {
  try {
    const supabase = createClient()

    // Check if Upgate is enabled in admin settings
    const { data: gatewayData } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "payment_gateway")
      .maybeSingle()

    const paymentGateway = gatewayData?.value || "stripe"
    const isUpgateEnabled = paymentGateway === "upgate"

    // Get Upgate configuration from admin settings
    const { data: keyData } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "upgate_key")
      .maybeSingle()

    const { data: statusData } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "upgate_status")
      .maybeSingle()

    // Fallback to environment variables if not in database
    const upgateKey = keyData?.value || process.env.UPGATE_KEY
    const upgateStatus = statusData?.value || process.env.UPGATE_STATUS || "test"

    // Determine the API domain based on status
    const upgateDomain =
      upgateStatus === "live" ? "api.upgate.com" : "api.sandbox.upgate.com"

    return {
      isEnabled: isUpgateEnabled,
      apiKey: upgateKey,
      status: upgateStatus,
      domain: upgateDomain,
      baseUrl: `https://${upgateDomain}/v1`,
    }
  } catch (error) {
    console.error("Error getting Upgate config:", error)
    return {
      isEnabled: false,
      apiKey: null,
      status: "test",
      domain: "api.sandbox.upgate.com",
      baseUrl: "https://api.sandbox.upgate.com/v1",
    }
  }
}

/**
 * Create a checkout session with Upgate
 */
export async function createUpgateCheckout(
  data: UpgateCheckoutData
): Promise<UpgateCheckoutResponse> {
  try {
    const config = await getUpgateConfig()

    // Debug: Log configuration
    console.log("🔵 [UPGATE DEBUG] Configuration loaded:", {
      isEnabled: config.isEnabled,
      status: config.status,
      domain: config.domain,
      baseUrl: config.baseUrl,
      apiKeyPresent: !!config.apiKey,
      apiKeyPrefix: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'None',
    })

    if (!config.apiKey) {
      console.error("🔴 [UPGATE ERROR] API key is not configured")
      return {
        success: false,
        error: "Upgate API key is not configured",
      }
    }

    const requestBody = {
      payment_data: {
        merchant_payment_id: data.merchant_payment_id,
        methods: data.methods,
        type: data.type,
        amount: data.amount,
        currency_code: data.currency_code,
      },
      customer: {
        merchant_customer_id: data.merchant_customer_id,
      },
      callback: {
        success_url: data.success_url,
        failure_url: data.failure_url,
      },
      products: data.products,
    }

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Debug: Log request details
    console.log("🔵 [UPGATE DEBUG] Creating checkout session:")
    console.log("  URL:", `${config.baseUrl}/checkout`)
    console.log("  Idempotency Key:", idempotencyKey)
    console.log("  Request Body:", JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${config.baseUrl}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": config.apiKey,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    })

    // Debug: Log response status
    console.log("🔵 [UPGATE DEBUG] Response received:")
    console.log("  Status:", response.status, response.statusText)
    console.log("  Headers:", Object.fromEntries(response.headers.entries()))

    // Get the raw response text first
    const responseText = await response.text()
    console.log("🔵 [UPGATE DEBUG] Raw response body:", responseText)

    // Try to parse as JSON
    let result
    try {
      result = responseText ? JSON.parse(responseText) : {}
      console.log("🔵 [UPGATE DEBUG] Parsed response:", JSON.stringify(result, null, 2))
    } catch (parseError) {
      console.error("🔴 [UPGATE ERROR] Failed to parse response as JSON:", parseError)
      console.error("🔴 [UPGATE ERROR] Response was:", responseText)
      return {
        success: false,
        error: `Invalid response from Upgate: ${responseText || 'Empty response'}`,
      }
    }

    if (!response.ok) {
      console.error("🔴 [UPGATE ERROR] Checkout failed:", {
        status: response.status,
        statusText: response.statusText,
        error: result,
      })
      return {
        success: false,
        error: result.message || result.error || "Failed to create Upgate checkout session",
      }
    }

    // Extract the correct fields from Upgate's response structure
    const checkoutId = result.id
    const checkoutUrl = result.session?.redirect_url

    console.log("✅ [UPGATE SUCCESS] Checkout session created:", {
      checkout_id: checkoutId,
      checkout_url: checkoutUrl,
    })

    if (!checkoutUrl) {
      console.error("🔴 [UPGATE ERROR] No redirect URL in response")
      return {
        success: false,
        error: "No redirect URL received from Upgate",
      }
    }

    return {
      success: true,
      checkout_url: checkoutUrl,
      checkout_id: checkoutId,
    }
  } catch (error) {
    console.error("🔴 [UPGATE ERROR] Exception in createUpgateCheckout:", error)
    if (error instanceof Error) {
      console.error("🔴 [UPGATE ERROR] Error stack:", error.stack)
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Get transaction details from Upgate
 */
export async function getUpgateTransaction(transactionId: string) {
  try {
    const config = await getUpgateConfig()

    if (!config.apiKey) {
      throw new Error("Upgate API key is not configured")
    }

    const response = await fetch(
      `${config.baseUrl}/transaction?transaction_id=${transactionId}`,
      {
        method: "GET",
        headers: {
          "X-Api-Key": config.apiKey,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch transaction: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error fetching Upgate transaction:", error)
    throw error
  }
}

/**
 * Test Upgate connection
 */
export async function testUpgateConnection(): Promise<{
  success: boolean
  message: string
}> {
  try {
    const config = await getUpgateConfig()

    if (!config.apiKey) {
      return {
        success: false,
        message: "Upgate API key is not configured",
      }
    }

    // Try to make a simple API call to verify the connection
    const response = await fetch(`${config.baseUrl}/transaction?limit=1`, {
      method: "GET",
      headers: {
        "X-Api-Key": config.apiKey,
      },
    })

    if (response.ok) {
      return {
        success: true,
        message: `Successfully connected to Upgate (${config.status} mode)`,
      }
    } else {
      return {
        success: false,
        message: `Failed to connect: ${response.statusText}`,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed",
    }
  }
}
