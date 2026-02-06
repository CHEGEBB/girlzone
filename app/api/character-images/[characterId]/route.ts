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

    const { data: images, error } = await supabase
      .from('generated_images')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching character images:', error)
      return NextResponse.json(
        { error: 'Failed to fetch images' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      images: images || []
    })

  } catch (error) {
    console.error('Error in character images API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
