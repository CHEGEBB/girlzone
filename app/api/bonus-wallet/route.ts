import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

// GET - Get user's bonus wallet info
export async function GET(request: Request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get or create bonus wallet
    let { data: wallet, error: walletError } = await supabase
      .from('bonus_wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (walletError && walletError.code === 'PGRST116') {
      // Wallet doesn't exist, create it
      const { data: newWallet, error: createError } = await supabase
        .from('bonus_wallets')
        .insert({
          user_id: user.id,
          balance: 0,
          lifetime_earnings: 0,
          withdrawn_amount: 0,
        })
        .select()
        .single()

      if (createError) {
        console.error("Error creating wallet:", createError)
        return NextResponse.json(
          { error: "Failed to create wallet" },
          { status: 500 }
        )
      }

      wallet = newWallet
    } else if (walletError) {
      console.error("Error fetching wallet:", walletError)
      return NextResponse.json(
        { error: "Failed to fetch wallet" },
        { status: 500 }
      )
    }

    // Get referral code from user_profiles
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('referral_code')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      wallet,
      referralCode: userProfile?.referral_code || null,
    })
  } catch (error) {
    console.error("Error in bonus-wallet API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update USDT address
export async function PUT(request: Request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { usdtAddress } = body

    if (!usdtAddress) {
      return NextResponse.json(
        { error: "USDT address is required" },
        { status: 400 }
      )
    }

    // Update wallet
    const { error: updateError } = await supabase
      .from('bonus_wallets')
      .update({ usdt_address: usdtAddress })
      .eq('user_id', user.id)

    if (updateError) {
      console.error("Error updating USDT address:", updateError)
      return NextResponse.json(
        { error: "Failed to update USDT address" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "USDT address updated successfully",
    })
  } catch (error) {
    console.error("Error in bonus-wallet PUT API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
