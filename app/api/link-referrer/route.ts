import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // Get the current user (the one who just signed up)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { referralCode } = body

    if (!referralCode) {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 }
      )
    }

    // Find the referrer by their referral code
    const { data: referrerProfile, error: referrerError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('referral_code', referralCode)
      .maybeSingle()

    console.log("Looking for referrer with code:", referralCode)
    console.log("Referrer query result:", { data: referrerProfile, error: referrerError })

    if (referrerError) {
      console.error("Error querying referrer:", referrerError)
      return NextResponse.json(
        { error: "Database error while looking up referral code" },
        { status: 500 }
      )
    }

    if (!referrerProfile) {
      console.error("Referrer not found for code:", referralCode)
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 404 }
      )
    }

    // Don't allow self-referral
    if (referrerProfile.user_id === user.id) {
      return NextResponse.json(
        { error: "Cannot refer yourself" },
        { status: 400 }
      )
    }

    // Update the new user's profile with the referrer_id
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ referrer_id: referrerProfile.user_id })
      .eq('user_id', user.id)

    if (updateError) {
      console.error("Error updating referrer:", updateError)
      return NextResponse.json(
        { error: "Failed to link referrer" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Referrer linked successfully",
      referrerId: referrerProfile.user_id,
    })
  } catch (error) {
    console.error("Error in link-referrer API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
