import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-browser'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, prompt, characterId } = await request.json()

    if (!imageUrl || !prompt || !characterId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS for this query
    const supabase = await getAdminClient()

    // Get user ID from the character's owner
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('user_id')
      .eq('id', characterId)
      .single()

    if (charError) {
      console.error('Error fetching character:', charError)
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    // Use the character's owner as the user_id
    const userId = character.user_id

    // Save to database with character_id
    const { data, error } = await supabase
      .from('generated_images')
      .insert({
        image_url: imageUrl, // Use the original RunPod URL for now
        prompt: prompt,
        character_id: characterId,
        user_id: userId, // Use the character owner's user ID
        favorite: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving character image:', error)
      return NextResponse.json(
        { error: `Failed to save image to database: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      image: data
    })

  } catch (error) {
    console.error('Error in save character image API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
