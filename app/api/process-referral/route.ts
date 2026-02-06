import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { referral_code, signup_completed } = await request.json();

    if (!referral_code || !signup_completed) {
      return NextResponse.json({
        status: 'error',
        message: 'Referral code and signup confirmation required',
        data: null
      }, { status: 400 });
    }

    // Get auth user (the new user)
    const supabaseServer = createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        status: 'error',
        message: 'User not authenticated',
        data: null
      }, { status: 401 });
    }

    // Find referrer by referral code
    const { data: referrerData, error: referrerError } = await supabaseServer
      .from('user_referrals')
      .select('user_id')
      .eq('referral_code', referral_code.toUpperCase())
      .single();

    if (referrerError || !referrerData) {
      console.error('Error finding referrer:', referrerError);
      return NextResponse.json({
        status: 'error',
        message: 'Invalid referral code',
        data: null
      }, { status: 400 });
    }

    const referrerId = referrerData.user_id;

    // Check if a referral relationship already exists
    const { data: existingRelationship, error: relationshipError } = await supabaseServer
      .from('referral_signups')
      .select('id')
      .eq('referrer_id', referrerId)
      .eq('referred_user_id', user.id)
      .single();

    if (relationshipError && relationshipError.code !== 'PGRST116') {
      console.error('Error checking existing relationship:', relationshipError);
      return NextResponse.json({
        status: 'error',
        message: 'Database error',
        data: null
      }, { status: 500 });
    }

    if (existingRelationship) {
      return NextResponse.json({
        status: 'success',
        message: 'Referral relationship already exists',
        data: { tokens_rewarded: 0 }
      });
    }

    // Start transaction - process referral reward
    try {
      // Insert referral relationship
      const { error: insertError } = await supabaseServer
        .from('referral_signups')
        .insert({
          referrer_id: referrerId,
          referred_user_id: user.id,
          reward_given: true
        });

      if (insertError) {
        console.error('Error inserting referral relationship:', insertError);
        return NextResponse.json({
          status: 'error',
          message: 'Failed to process referral',
          data: null
        }, { status: 500 });
      }

      // Reward referrer with 10 tokens - increment approach
      const { data: currentTokens, error: getTokensError } = await supabaseServer
        .from('profiles')
        .select('tokens')
        .eq('id', referrerId)
        .single();

      if (getTokensError) {
        console.error('Error getting current tokens:', getTokensError);
        return NextResponse.json({
          status: 'error',
          message: 'Failed to process referral reward',
          data: null
        }, { status: 500 });
      }

      const newTokenCount = (currentTokens?.tokens || 0) + 10;

      const { error: tokenError } = await supabaseServer
        .from('profiles')
        .update({ tokens: newTokenCount })
        .eq('id', referrerId);

      if (tokenError) {
        console.error('Error updating tokens:', tokenError);
        return NextResponse.json({
          status: 'error',
          message: 'Failed to process referral reward',
          data: null
        }, { status: 500 });
      }

      // Update referral stats - increment approach
      const { data: currentStats, error: getStatsError } = await supabaseServer
        .from('user_referrals')
        .select('total_signups, tokens_earned')
        .eq('user_id', referrerId)
        .single();

      if (getStatsError) {
        console.error('Error getting current stats:', getStatsError);
        // Don't fail for stats error
      } else {
        const { error: statsError } = await supabaseServer
          .from('user_referrals')
          .update({
            total_signups: (currentStats?.total_signups || 0) + 1,
            tokens_earned: (currentStats?.tokens_earned || 0) + 10,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', referrerId);


      }



      return NextResponse.json({
        status: 'success',
        message: 'Referral processed successfully. Referrer rewarded with 10 tokens.',
        data: {
          referrer_id: referrerId,
          tokens_rewarded: 10
        }
      });

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to complete referral processing',
        data: null
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      data: null
    }, { status: 500 });
  }
}
