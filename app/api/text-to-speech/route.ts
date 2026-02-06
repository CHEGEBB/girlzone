import { type NextRequest, NextResponse } from "next/server"
import { createClient } from '@/utils/supabase/server'
import { hasEnoughTokens, deductTokens } from '@/lib/token-utils'

export async function POST(request: NextRequest) {
  try {
    const { text, voice, language, userId } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // TTS cost: 1 token per message
    const ttsCost = 1

    // Check if user has enough tokens
    const hasTokens = await hasEnoughTokens(userId, ttsCost)
    if (!hasTokens) {
      return NextResponse.json({ 
        error: "Insufficient tokens for text-to-speech",
        insufficientTokens: true,
        requiredTokens: ttsCost
      }, { status: 400 })
    }

    // Get the ModelSlab API key from environment variables
    const apiKey = process.env.MODELSLAB_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "ModelSlab API key is not configured" }, { status: 500 })
    }

    console.log("Using ModelSlab API key:", apiKey.substring(0, 5) + "...")
    console.log("Generating speech for text:", text.substring(0, 50) + "...")

    // Use ModelSlab voice ID - default to female voice, but can be overridden by frontend
    const voiceId = voice || "M7baJQBjzMsrxxZ796H6"
    console.log("Using voice ID:", voiceId)
    
    const response = await fetch("https://modelslab.com/api/v7/voice/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: "eleven_multilingual_v2",
        prompt: text,
        voice_id: voiceId,
        key: apiKey
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("ModelSlab API error response:", errorText)

      try {
        // Try to parse as JSON if possible
        const errorData = JSON.parse(errorText)
        console.error("Parsed error data:", errorData)
      } catch (parseError) {
        console.error("Could not parse error response as JSON")
      }

      return NextResponse.json(
        { error: `Failed to generate speech: ${errorText}` },
        { status: response.status },
      )
    }

    // Check the content type of the response
    const contentType = response.headers.get('content-type')
    console.log("Response content type:", contentType)

    // ModelSlab might return JSON with audio URL or direct audio data
    if (contentType && contentType.includes('application/json')) {
      // Handle JSON response (might contain audio URL)
      const jsonData = await response.json()
      console.log("ModelSlab JSON response:", jsonData)
      
      if (jsonData.output && Array.isArray(jsonData.output) && jsonData.output.length > 0) {
        // ModelSlab returns audio URL in output array
        const audioUrl = jsonData.output[0]
        
        // Deduct tokens after successful speech generation
        await deductTokens(userId, ttsCost, "Text-to-speech generation", {
          textLength: text.length,
          voice: voiceId,
          language: language || "en-US"
        })
        
        return NextResponse.json({
          audioUrl: audioUrl,
          taskId: null,
        })
      } else if (jsonData.audio_url || jsonData.url) {
        const audioUrl = jsonData.audio_url || jsonData.url
        
        // Deduct tokens after successful speech generation
        await deductTokens(userId, ttsCost, "Text-to-speech generation", {
          textLength: text.length,
          voice: voiceId,
          language: language || "en-US"
        })
        
        return NextResponse.json({
          audioUrl: audioUrl,
          taskId: null,
        })
      } else if (jsonData.audio) {
        // If audio is base64 encoded in JSON
        const audioDataUrl = `data:audio/mp3;base64,${jsonData.audio}`
        
        // Deduct tokens after successful speech generation
        await deductTokens(userId, ttsCost, "Text-to-speech generation", {
          textLength: text.length,
          voice: voiceId,
          language: language || "en-US"
        })
        
        return NextResponse.json({
          audioUrl: audioDataUrl,
          taskId: null,
        })
      } else {
        console.error("Unexpected JSON response format:", jsonData)
        return NextResponse.json({ error: "Unexpected response format from ModelSlab" }, { status: 500 })
      }
    } else {
      // Handle direct audio data response
      const audioBuffer = await response.arrayBuffer()
      console.log("Audio buffer size:", audioBuffer.byteLength)
      
      // Convert the audio buffer to a base64 data URL for the frontend
      const base64Audio = Buffer.from(audioBuffer).toString('base64')
      const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`

      console.log("ModelSlab speech generation successful, audio data URL length:", audioDataUrl.length)
      
      // Deduct tokens after successful speech generation
      await deductTokens(userId, ttsCost, "Text-to-speech generation", {
        textLength: text.length,
        voice: voiceId,
        language: language || "en-US"
      })
      
      return NextResponse.json({
        audioUrl: audioDataUrl,
        taskId: null, // ModelSlab returns audio directly, no task ID needed
      })
    }
  } catch (error) {
    console.error("Error in text-to-speech API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
