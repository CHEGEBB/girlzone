import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(request: NextRequest) {
  try {
    // Check for authorization header (for cron job security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, require authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Execute the token grant function
    const { data, error } = await supabase.rpc('grant_monthly_tokens_to_subscribers')

    if (error) {
      console.error('Error granting subscription tokens:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Count successful grants
    const successfulGrants = data?.filter((grant: any) => grant.subscription_status === 'active').length || 0
    const totalProcessed = data?.length || 0

    console.log(`Monthly token grant completed: ${successfulGrants}/${totalProcessed} users granted tokens`)

    return NextResponse.json({
      success: true,
      grants: data,
      summary: {
        total_processed: totalProcessed,
        successful_grants: successfulGrants,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Unexpected error in grant-subscription-tokens:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also allow GET for manual testing (optional)
export async function GET(request: NextRequest) {
  // For security, you might want to restrict this to admin users only
  // For now, allowing GET for testing purposes

  try {
    const supabase = createClient()

    // Get current month status
    const { data: grants, error } = await supabase
      .from('subscription_token_grants')
      .select('*')
      .gte('grant_month', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      current_month_grants: grants,
      total_grants_this_month: grants?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
