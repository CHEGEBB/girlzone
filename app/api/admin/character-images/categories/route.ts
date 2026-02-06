import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all categories
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('character_image_categories')
      .select('*')
      .order('step_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    return NextResponse.json({ categories: data })
  } catch (error) {
    console.error('Error in GET /api/admin/character-images/categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, display_name, description, step_order } = body

    if (!name || !display_name || step_order === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('character_image_categories')
      .insert({
        name,
        display_name,
        description,
        step_order: parseInt(step_order),
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json({ category: data })
  } catch (error) {
    console.error('Error in POST /api/admin/character-images/categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, display_name, description, step_order, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (display_name !== undefined) updateData.display_name = display_name
    if (description !== undefined) updateData.description = description
    if (step_order !== undefined) updateData.step_order = parseInt(step_order)
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabase
      .from('character_image_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    return NextResponse.json({ category: data })
  } catch (error) {
    console.error('Error in PUT /api/admin/character-images/categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('character_image_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/character-images/categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
