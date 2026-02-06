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

    // Get user's downlines using the database function
    const { data: downlines, error: downlinesError } = await supabase
      .rpc('get_user_downlines', {
        p_user_id: user.id,
        p_max_level: 3
      })

    if (downlinesError) {
      console.error("Error fetching downlines:", downlinesError)
      return NextResponse.json(
        { error: "Failed to fetch downlines" },
        { status: 500 }
      )
    }

    // Calculate stats by level
    const stats = {
      level1: downlines?.filter((d: any) => d.level === 1).length || 0,
      level2: downlines?.filter((d: any) => d.level === 2).length || 0,
      level3: downlines?.filter((d: any) => d.level === 3).length || 0,
      total: downlines?.length || 0,
    }

    return NextResponse.json({
      success: true,
      downlines: downlines || [],
      stats,
    })
  } catch (error) {
    console.error("Error in downlines API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
