import { createAdminClient } from "@/lib/supabase-admin"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const resolvedParams = await params
    const { code } = resolvedParams

    if (!code) {
      return NextResponse.json(
        { error: "Share code is required" },
        { status: 400 }
      )
    }

    const supabaseAdmin = await createAdminClient()
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Failed to initialize database client" },
        { status: 500 }
      )
    }

    // Track the click and get affiliate info
    const { data: trackData, error: trackError } = await supabaseAdmin
      .rpc('track_share_click', { p_share_code: code })
      .single()

    if (trackError || !trackData) {
      console.error("Error tracking share click:", trackError)
      return NextResponse.json(
        { error: "Invalid or inactive share code" },
        { status: 404 }
      )
    }

    // Type assertion for the RPC response
    const shareInfo = trackData as {
      character_id: string
      user_id: string
      affiliate_code: string | null
      include_history: boolean
      chat_data: any
    }

    // Get referral code (prioritize RPC result, fallback to user_profiles)
    let referralCode = shareInfo.affiliate_code;
    
    // If no affiliate code found via RPC (which only checks affiliates table),
    // check user_profiles table for a standard referral code
    if (!referralCode && shareInfo.user_id) {
      const { data: profileData } = await supabaseAdmin
        .from('user_profiles')
        .select('referral_code')
        .eq('user_id', shareInfo.user_id)
        .single()
        
      if (profileData?.referral_code) {
        referralCode = profileData.referral_code;
      }
    }

    // Set affiliate cookie if referral code exists
    if (referralCode) {
      const cookieStore = await cookies()
      cookieStore.set('affiliate_code', referralCode, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      })
    }

    // Get character info - using a more flexible query
    const { data: characters, error: characterError } = await supabaseAdmin
      .from('user_characters')
      .select('id, character_name, image_url, enhanced_prompt, age, personality, relationship')
      .eq('id', shareInfo.character_id)

    if (characterError) {
      console.error("Error fetching character:", characterError)
    }

    // If no character found in user_characters, return basic info
    const character = characters && characters.length > 0 ? {
      id: characters[0].id,
      name: characters[0].character_name,
      image: characters[0].image_url,
      description: characters[0].enhanced_prompt || '',
      age: characters[0].age || '',
      occupation: characters[0].personality || characters[0].relationship || '',
    } : {
      id: shareInfo.character_id,
      name: 'AI Character',
      image: '/placeholder.svg',
      description: 'Chat with this amazing AI character',
      age: '',
      occupation: 'AI Companion',
    }

    return NextResponse.json({
      success: true,
      character,
      includeHistory: shareInfo.include_history,
      chatData: shareInfo.chat_data,
      affiliateCode: referralCode, // Use the resolved referral code
    })
  } catch (error) {
    console.error("Error in shared-chat API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
