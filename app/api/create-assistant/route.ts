import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { character } = await request.json()
    
    console.log("Received character data:", character)
    console.log("Character system prompt:", character?.systemPrompt)
    console.log("Character system_prompt:", character?.system_prompt)
    console.log("All character keys:", Object.keys(character || {}))
    
    // Determine which system prompt to use
    const systemPrompt = character?.systemPrompt || character?.system_prompt
    console.log("Final system prompt to use:", systemPrompt)
    
    // Get greeting/first message
    const greeting = character?.greeting || character?.firstMessage || `Hey there! I'm ${character?.name || "your AI assistant"}. It's great to meet you!`
    console.log("Character greeting:", greeting)
    
    const apiKey = process.env.VAPI_PRIVATE_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Vapi API key not configured" },
        { status: 500 }
      )
    }

    // Determine voice based on character category
    // Check category field which is used for homepage filtering (Girls, Men/Guys, Anime)
    const characterCategory = (character?.category || '').toLowerCase()
    
    console.log("Character category detected:", characterCategory)
    console.log("Character object keys:", Object.keys(character || {}))
    
    // Select voice: Cole for men/male/guys categories, Hana for girls/female/anime/default
    // Anime characters use female voice (Hana) as requested
    const isMale = characterCategory.includes('men') || 
                   characterCategory.includes('male') || 
                   characterCategory.includes('guy')
    const voiceId = isMale ? "Cole" : "Hana"
    console.log(`Selected voice: ${voiceId} for category: ${characterCategory}`)

    // Create assistant data
    const assistantData = {
      name: character?.name || "AI Character",
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt || `You are ${character?.name || "an AI assistant"}. Be helpful, friendly, and engaging in conversation. Keep responses concise and natural.`
          },
          {
            role: "assistant",
            content: greeting
          }
        ]
      },
      voice: {
        provider: "vapi",
        voiceId: voiceId
      },
      firstMessage: greeting
    }

    console.log("Creating assistant:", assistantData)

    // Create assistant via Vapi API
    const assistantResponse = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(assistantData),
    })

    const assistantResult = await assistantResponse.json()
    console.log("Assistant creation response:", assistantResult)

    if (!assistantResponse.ok) {
      console.error("Full error details:", assistantResult)
      return NextResponse.json(
        { 
          error: assistantResult.message?.[0] || assistantResult.error || "Failed to create assistant",
          details: assistantResult 
        },
        { status: assistantResponse.status }
      )
    }

    // Store the assistant ID in the database
    try {
      const supabase = createClient()
      
      console.log('💾 Storing assistant ID in database for character:', character.id)
      
      const { data: updateData, error: updateError } = await supabase
        .from('characters')
        .update({ vapi_assistant_id: assistantResult.id })
        .eq('id', character.id)
        .select()

      if (updateError) {
        console.error('❌ Failed to store assistant ID in database:', updateError)
        // Still return success since Vapi assistant was created
        // User can recreate it if needed
        return NextResponse.json({
          success: true,
          assistantId: assistantResult.id,
          message: `Activated ${character?.name || "assistant"}`,
          warning: 'Assistant created but not saved to database. Please refresh.'
        })
      }
      
      console.log('✅ Successfully stored assistant ID in database:', assistantResult.id)
      console.log('📊 Database update result:', updateData)
      
      // Verify the storage by reading it back
      const { data: verifyData, error: verifyError } = await supabase
        .from('characters')
        .select('vapi_assistant_id')
        .eq('id', character.id)
        .single()
      
      if (verifyError) {
        console.error('⚠️ Could not verify assistant ID storage:', verifyError)
      } else {
        console.log('✅ Verified assistant ID in database:', verifyData?.vapi_assistant_id)
        if (verifyData?.vapi_assistant_id !== assistantResult.id) {
          console.error('❌ Assistant ID mismatch after storage!')
        }
      }
    } catch (dbError) {
      console.error('❌ Database error storing assistant ID:', dbError)
      // Still return success since Vapi assistant was created
      return NextResponse.json({
        success: true,
        assistantId: assistantResult.id,
        message: `Activated ${character?.name || "assistant"}`,
        warning: 'Assistant created but database error occurred. Please refresh.'
      })
    }

    return NextResponse.json({
      success: true,
      assistantId: assistantResult.id,
      message: `Activated ${character?.name || "assistant"}`
    })

  } catch (error) {
    console.error("Error creating assistant:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
