import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    
    if (!table) {
      return NextResponse.json({ error: "Table parameter is required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createRouteHandlerClient(
      { cookies: () => cookies() },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    )

    // Get all data from the specified table
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error(`Error fetching data from ${table}:`, error)
      return NextResponse.json({ 
        error: "Failed to fetch data", 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      table: table,
      data: data,
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
