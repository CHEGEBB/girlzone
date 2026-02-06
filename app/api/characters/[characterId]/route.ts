import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params

    if (!characterId) {
      return NextResponse.json(
        { error: 'Character ID is required' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS for this query
    const supabase = await getAdminClient()

    const { data: character, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (error) {
      console.error('Error fetching character:', error)
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      character
    })

  } catch (error) {
    console.error('Error in character API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

