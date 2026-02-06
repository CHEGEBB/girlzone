import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params
    const { favorite } = await request.json()

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS for this query
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('generated_images')
      .update({ favorite })
      .eq('id', imageId)
      .select()
      .single()

    if (error) {
      console.error('Error updating image favorite:', error)
      return NextResponse.json(
        { error: 'Failed to update image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      image: data
    })

  } catch (error) {
    console.error('Error in update image API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
