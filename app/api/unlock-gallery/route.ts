import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { createAdminClient } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const { userId, characterId } = await request.json()

    if (!userId || !characterId) {
      return NextResponse.json({ error: "Missing required fields: userId and characterId" }, { status: 400 })
    }

    const supabase = createClient()
    const supabaseAdmin = await createAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Failed to initialize database client" }, { status: 500 })
    }

    // Check if user has already unlocked this gallery
    const { data: existingUnlock, error: checkError } = await supabaseAdmin
      .from("gallery_unlocks")
      .select("id")
      .eq("user_id", userId)
      .eq("character_id", characterId)
      .single()

    if (existingUnlock) {
      return NextResponse.json({ 
        success: true, 
        message: "Gallery already unlocked",
        alreadyUnlocked: true 
      })
    }

    // Check token balance from user_tokens table
    const { data: userTokens, error: tokensError } = await supabaseAdmin
      .from("user_tokens")
      .select("balance")
      .eq("user_id", userId)
      .single()

    if (tokensError || !userTokens) {
      return NextResponse.json({ 
        error: "Failed to fetch user tokens",
        insufficientTokens: true,
        currentBalance: 0,
        requiredTokens: 1000
      }, { status: 402 })
    }

    const requiredTokens = 1000
    if (userTokens.balance < requiredTokens) {
      return NextResponse.json({
        error: "Insufficient tokens",
        insufficientTokens: true,
        currentBalance: userTokens.balance,
        requiredTokens: requiredTokens
      }, { status: 402 })
    }

    // Deduct tokens from user_tokens table
    const newBalance = userTokens.balance - requiredTokens
    const { error: updateError } = await supabaseAdmin
      .from("user_tokens")
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)

    if (updateError) {
      console.error("Failed to deduct tokens:", updateError)
      return NextResponse.json({ error: "Failed to deduct tokens" }, { status: 500 })
    }

    // Record transaction
    const { error: transactionError } = await supabaseAdmin
      .from("token_transactions")
      .insert({
        user_id: userId,
        amount: -requiredTokens,
        type: 'usage',
        description: `Unlocked gallery for character ${characterId}`,
        created_at: new Date().toISOString()
      })

    if (transactionError) {
      console.error("Failed to record transaction:", transactionError)
      // Don't fail the request for transaction recording errors
    }

    // Record the unlock
    const { error: insertError } = await supabaseAdmin
      .from("gallery_unlocks")
      .insert({
        user_id: userId,
        character_id: characterId
      })

    if (insertError) {
      console.error("Failed to record gallery unlock:", insertError)
      // Try to refund tokens if unlock recording failed
      await supabaseAdmin
        .from("user_tokens")
        .update({ 
          balance: userTokens.balance,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
      
      return NextResponse.json({ error: "Failed to unlock gallery" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      newBalance: newBalance,
      message: "Gallery unlocked successfully"
    })
  } catch (error) {
    console.error("[API] Unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
