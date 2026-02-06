import { type NextRequest, NextResponse } from "next/server"
import { hasEnoughTokens, deductTokens } from '@/lib/token-utils'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, userId, characterId } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Phone call cost: 3 tokens per minute (minimum 1 minute)
    const callCost = 3
    const tokensPerMinute = 3

    // Check if user has enough tokens
    const hasTokens = await hasEnoughTokens(userId, callCost)
    if (!hasTokens) {
      return NextResponse.json({ 
        error: "Insufficient tokens for phone call",
        insufficientTokens: true,
        requiredTokens: callCost
      }, { status: 400 })
    }

    // Get API key from environment variable
    const apiKey = process.env.BLAND_AI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Simplified request based on working PHP example
    const blandAIRequest = {
      phone_number: phoneNumber,
      task: "fgfhg", // Simple task string as in the PHP example
      voice: "bbeabae6-ec8d-444f-92ad-c8e620d3de8d", // Using the specific voice ID from the example
      first_sentence: "hello there",
      // No additional complex parameters
    }

    console.log("Sending request to Bland AI:", JSON.stringify(blandAIRequest))

    // Make the API call to Bland AI
    const response = await fetch("https://api.bland.ai/v1/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey, // Direct API key without "Bearer" prefix
      },
      body: JSON.stringify(blandAIRequest),
    })

    const data = await response.json()
    console.log("Bland AI response:", JSON.stringify(data))

    if (!response.ok) {
      console.error("Bland AI API error:", data)
      return NextResponse.json({ error: data.error || "Failed to initiate call" }, { status: response.status })
    }

    // Create call session record
    const supabase = createClient()
    const { data: callSession, error: sessionError } = await supabase
      .from("call_sessions")
      .insert({
        user_id: userId,
        character_id: characterId,
        call_id: data.call_id,
        phone_number: phoneNumber,
        status: "initiated",
        tokens_charged: callCost,
        estimated_duration_minutes: 1,
        tokens_per_minute: tokensPerMinute
      })
      .select()
      .single()

    if (sessionError) {
      console.error("Error creating call session:", sessionError)
      // Continue anyway, but log the error
    }

    // Deduct tokens after successful call initiation
    await deductTokens(userId, callCost, "Phone call initiation", {
      phoneNumber: phoneNumber,
      characterId: characterId,
      callId: data.call_id,
      callSessionId: callSession?.id,
      estimatedDuration: 1 // Minimum 1 minute
    }, "voice_call_consumption")

    return NextResponse.json({
      success: true,
      callId: data.call_id,
      message: "Call initiated successfully",
      tokensDeducted: callCost,
      callSessionId: callSession?.id
    })
  } catch (error) {
    console.error("Error in call API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
