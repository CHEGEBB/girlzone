import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    // Use admin client to fetch all characters (not just user's)
    const supabase = await getAdminClient()

    // Fetch all characters from the database
    const { data: characters, error } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching characters:', error)
      return NextResponse.json(
        { error: 'Failed to fetch characters' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      characters: characters || []
    })

  } catch (error) {
    console.error('Error in characters API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
