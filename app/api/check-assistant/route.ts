import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('characterId')

    if (!characterId) {
      return NextResponse.json(
        { error: "Character ID is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get character with assistant ID
    const { data, error } = await supabase
      .from('characters')
      .select('id, name, vapi_assistant_id')
      .eq('id', characterId)
      .single()

    const character = data as any

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Character not found" },
          { status: 404 }
        )
      }
      console.error('Database error:', error)
      return NextResponse.json(
        { error: "Failed to fetch character" },
        { status: 500 }
      )
    }

    if (!character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      )
    }

    // If there's an assistant ID, verify it exists in Vapi
    let isValidAssistant = false
    if (character.vapi_assistant_id) {
      const apiKey = process.env.VAPI_PRIVATE_KEY
      if (apiKey) {
        try {
          const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${character.vapi_assistant_id}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
            },
          })

          if (vapiResponse.ok) {
            isValidAssistant = true
            console.log(`✅ Assistant ${character.vapi_assistant_id} exists in Vapi`)
          } else {
            console.warn(`⚠️ Assistant ${character.vapi_assistant_id} not found in Vapi, clearing from database`)
            // Clear invalid assistant ID from database
            await (supabase
              .from('characters') as any)
              .update({ vapi_assistant_id: null })
              .eq('id', characterId)
          }
        } catch (vapiError) {
          console.error('Error validating assistant with Vapi:', vapiError)
        }
      }
    }

    return NextResponse.json({
      characterId: character.id,
      characterName: character.name,
      hasAssistant: isValidAssistant,
      assistantId: isValidAssistant ? character.vapi_assistant_id : null
    })

  } catch (error) {
    console.error("Error checking assistant status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
