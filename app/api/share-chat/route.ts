import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { characterId, includeHistory, chatData } = body

    if (!characterId) {
      return NextResponse.json(
        { error: "Character ID is required" },
        { status: 400 }
      )
    }

    // Generate unique share code
    const { data: shareCodeData, error: shareCodeError } = await supabase
      .rpc('generate_share_code')

    if (shareCodeError || !shareCodeData) {
      console.error("Error generating share code:", shareCodeError)
      return NextResponse.json(
        { error: "Failed to generate share code" },
        { status: 500 }
      )
    }

    const shareCode = shareCodeData

    // Create shared chat record
    const { data: sharedChat, error: insertError } = await supabase
      .from('shared_chats')
      .insert({
        user_id: user.id,
        character_id: characterId,
        share_code: shareCode,
        include_history: includeHistory || false,
        chat_data: includeHistory ? chatData : null,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error creating shared chat:", insertError)
      return NextResponse.json(
        { error: "Failed to create shared chat" },
        { status: 500 }
      )
    }

    // Get user's referral/affiliate code to append to the URL
    // First try user_profiles (main referral system)
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('referral_code')
      .eq('user_id', user.id)
      .single()
      
    // If not found, try affiliates table (legacy/specific affiliate system)
    let referralCode = profileData?.referral_code;
    
    if (!referralCode) {
      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('affiliate_code')
        .eq('user_id', user.id)
        .single()
      referralCode = affiliateData?.affiliate_code;
    }

    // Construct shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'http://localhost:3000'
    let shareUrl = `${baseUrl}/shared-chat/${shareCode}`
    
    // Append referral code if available
    if (referralCode) {
      shareUrl += `?ref=${referralCode}`
    }

    return NextResponse.json({
      success: true,
      shareCode,
      shareUrl,
      sharedChat,
    })
  } catch (error) {
    console.error("Error in share-chat API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch user's shared chats
export async function GET(request: Request) {
  try {
    const supabase = createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user's shared chats
    const { data: sharedChats, error: fetchError } = await supabase
      .from('shared_chats')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error("Error fetching shared chats:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch shared chats" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sharedChats: sharedChats || [],
    })
  } catch (error) {
    console.error("Error in share-chat GET API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE endpoint to deactivate a shared chat
export async function DELETE(request: Request) {
  try {
    const supabase = createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const shareCode = searchParams.get('code')

    if (!shareCode) {
      return NextResponse.json(
        { error: "Share code is required" },
        { status: 400 }
      )
    }

    // Deactivate the shared chat
    const { error: updateError } = await supabase
      .from('shared_chats')
      .update({ is_active: false })
      .eq('share_code', shareCode)
      .eq('user_id', user.id)

    if (updateError) {
      console.error("Error deactivating shared chat:", updateError)
      return NextResponse.json(
        { error: "Failed to deactivate shared chat" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Shared chat deactivated successfully",
    })
  } catch (error) {
    console.error("Error in share-chat DELETE API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
