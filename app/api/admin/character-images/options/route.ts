import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all options or filter by category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')

    let query = supabase
      .from('character_image_options')
      .select(`
        *,
        character_image_categories (
          id,
          name,
          display_name,
          step_order
        )
      `)
      .order('sort_order', { ascending: true })

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching options:', error)
      return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 })
    }

    return NextResponse.json({ options: data })
  } catch (error) {
    console.error('Error in GET /api/admin/character-images/options:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new option
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category_id, option_key, display_name, image_url, sort_order } = body

    if (!category_id || !option_key || !display_name || !image_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('character_image_options')
      .insert({
        category_id,
        option_key,
        display_name,
        image_url,
        sort_order: sort_order || 0,
        is_active: true
      })
      .select(`
        *,
        character_image_categories (
          id,
          name,
          display_name,
          step_order
        )
      `)
      .single()

    if (error) {
      console.error('Error creating option:', error)
      return NextResponse.json({ error: 'Failed to create option' }, { status: 500 })
    }

    return NextResponse.json({ option: data })
  } catch (error) {
    console.error('Error in POST /api/admin/character-images/options:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update option
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, option_key, display_name, image_url, sort_order, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Option ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (option_key !== undefined) updateData.option_key = option_key
    if (display_name !== undefined) updateData.display_name = display_name
    if (image_url !== undefined) updateData.image_url = image_url
    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order)
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabase
      .from('character_image_options')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        character_image_categories (
          id,
          name,
          display_name,
          step_order
        )
      `)
      .single()

    if (error) {
      console.error('Error updating option:', error)
      return NextResponse.json({ error: 'Failed to update option' }, { status: 500 })
    }

    return NextResponse.json({ option: data })
  } catch (error) {
    console.error('Error in PUT /api/admin/character-images/options:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete option
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Option ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('character_image_options')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting option:', error)
      return NextResponse.json({ error: 'Failed to delete option' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/character-images/options:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
