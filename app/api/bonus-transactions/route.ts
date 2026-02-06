import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get user's bonus transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('bonus_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError)
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      )
    }

    // Get total count
    const { count } = await supabase
      .from('bonus_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      transactions: transactions || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error("Error in bonus-transactions API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
