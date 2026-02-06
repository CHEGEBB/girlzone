import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

/**
 * API endpoint to grant monthly tokens to all active premium subscribers
 * This endpoint should be called by an external cron service on the 1st of each month
 * 
 * Usage:
 * POST /api/cron/grant-subscription-tokens
 * Headers:
 *   Authorization: Bearer YOUR_CRON_SECRET
 */
export async function POST(request: Request) {
  try {
    // Verify the cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("CRON_SECRET environment variable is not set")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("Unauthorized cron job attempt")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = createClient()

    // Call the database function to grant tokens to all active subscribers
    const { data, error } = await supabase.rpc("grant_monthly_tokens_to_subscribers")

    if (error) {
      console.error("Error granting monthly tokens:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error.details,
        },
        { status: 500 }
      )
    }

    // Count successful and failed grants
    const results = data || []
    const successful = results.filter((r: any) => r.subscription_status === "active")
    const failed = results.filter((r: any) => r.subscription_status === "error")
    
    // Calculate total tokens granted
    const totalTokensGranted = successful.reduce((sum: number, r: any) => sum + (r.tokens_granted || 0), 0)

    const response = {
      success: true,
      message: "Monthly token grant completed",
      summary: {
        total_processed: results.length,
        successful_grants: successful.length,
        failed_grants: failed.length,
        total_tokens_granted: totalTokensGranted,
        average_tokens_per_user: successful.length > 0 ? Math.round(totalTokensGranted / successful.length) : 0,
      },
      timestamp: new Date().toISOString(),
      grants: results,
    }

    console.log("Monthly token grant completed:", response.summary)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Error in grant-subscription-tokens cron job:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    )
  }
}

// Handle GET requests for endpoint verification
export async function GET(request: Request) {
  // Verify authentication for GET requests too
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "Subscription token grant cron endpoint is active",
    endpoint: "/api/cron/grant-subscription-tokens",
    method: "POST",
    description: "Grants monthly bonus tokens to all active premium subscribers based on their plan",
  })
}
