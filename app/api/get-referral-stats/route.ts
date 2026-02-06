import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Get Referral Stats API Called ===');

    // Get auth user
    const supabaseServer = createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    console.log('Auth user result:', { user: user?.id, error: authError });

    if (authError || !user) {
      console.log('User not authenticated for stats');
      return NextResponse.json({
        status: 'error',
        message: 'User not authenticated',
        data: null
      }, { status: 401 });
    }

    // Get referral code and stats
    console.log('Getting referral data for user:', user.id);
    const { data: referralData, error: referralError } = await supabaseServer
      .from('user_referrals')
      .select('referral_code, total_clicks, total_signups, tokens_earned')
      .eq('user_id', user.id)
      .single();

    console.log('Referral data result:', { data: referralData, error: referralError });

    if (referralError && referralError.code !== 'PGRST116') {
      console.error('Error getting referral data:', referralError);
      return NextResponse.json({
        status: 'error',
        message: 'Database error',
        data: null
      }, { status: 500 });
    }

    if (!referralData) {
      // User doesn't have a referral code yet
      return NextResponse.json({
        status: 'success',
        message: 'No referral code found',
        data: {
          has_referral_code: false,
          referral_code: null,
          total_clicks: 0,
          total_signups: 0,
          tokens_earned: 0,
          current_tokens: 0
        }
      });
    }

    // Get current token balance from profiles table
    const { data: profileData, error: profileError } = await supabaseServer
      .from('profiles')
      .select('tokens')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error getting profile tokens:', profileError);
      return NextResponse.json({
        status: 'error',
        message: 'Database error',
        data: null
      }, { status: 500 });
    }

    const stats = {
      has_referral_code: true,
      referral_code: referralData.referral_code,
      total_clicks: referralData.total_clicks || 0,
      total_signups: referralData.total_signups || 0,
      tokens_earned: referralData.tokens_earned || 0,
      current_tokens: profileData?.tokens || 0
    };

    return NextResponse.json({
      status: 'success',
      message: 'Referral stats retrieved successfully.',
      data: stats
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      data: null
    }, { status: 500 });
  }
}
