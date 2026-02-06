import { type NextRequest, NextResponse } from "next/server"
import { createClient } from '@/utils/supabase/server'
import { deductTokens } from '@/lib/token-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Bland AI webhook payload structure
    const { call_id, status, duration, cost, recording_url, transcript } = body
    
    if (!call_id) {
      return NextResponse.json({ error: "Call ID is required" }, { status: 400 })
    }

    console.log("Received call webhook:", { call_id, status, duration })

    const supabase = createClient()
    
    // Find the call session
    const { data: callSession, error: sessionError } = await supabase
      .from("call_sessions")
      .select("*")
      .eq("call_id", call_id)
      .single()

    if (sessionError || !callSession) {
      console.error("Call session not found:", sessionError)
      return NextResponse.json({ error: "Call session not found" }, { status: 404 })
    }

    // Calculate actual duration in minutes (rounded up)
    const actualDurationSeconds = duration || 0
    const actualDurationMinutes = Math.ceil(actualDurationSeconds / 60)
    
    // Calculate additional tokens needed
    const initialMinutes = callSession.estimated_duration_minutes
    const additionalMinutes = Math.max(0, actualDurationMinutes - initialMinutes)
    const additionalTokens = additionalMinutes * callSession.tokens_per_minute

    // Update call session with final details
    const { error: updateError } = await supabase
      .from("call_sessions")
      .update({
        status: status === "completed" ? "completed" : "failed",
        actual_duration_seconds: actualDurationSeconds,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", callSession.id)

    if (updateError) {
      console.error("Error updating call session:", updateError)
    }

    // If there are additional minutes, charge for them
    if (additionalMinutes > 0) {
      try {
        // Deduct additional tokens
        await deductTokens(callSession.user_id, additionalTokens, "Additional call minutes", {
          callId: call_id,
          callSessionId: callSession.id,
          additionalMinutes: additionalMinutes,
          totalDurationMinutes: actualDurationMinutes,
          recordingUrl: recording_url,
          transcript: transcript
        })

        // Record additional billing
        await supabase
          .from("call_billing")
          .insert({
            call_session_id: callSession.id,
            user_id: callSession.user_id,
            billing_type: "additional_minutes",
            minutes_billed: additionalMinutes,
            tokens_charged: additionalTokens
          })

        console.log(`Charged ${additionalTokens} tokens for ${additionalMinutes} additional minutes`)
      } catch (billingError) {
        console.error("Error charging additional tokens:", billingError)
        // Don't fail the webhook, just log the error
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Call webhook processed successfully",
      additionalTokensCharged: additionalTokens
    })
  } catch (error) {
    console.error("Error processing call webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
