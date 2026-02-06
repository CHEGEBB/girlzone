import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getClientIP } from '@/lib/referral-utils';

export async function POST(request: NextRequest) {
  try {
    const { referral_code } = await request.json();

    if (!referral_code) {
      return NextResponse.json({
        status: 'error',
        message: 'Referral code is required',
        data: null
      }, { status: 400 });
    }

    const supabaseServer = createClient();

    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Check if this IP has clicked this code recently (within last hour)
    // to prevent abuse
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recentClicks, error: recentError } = await supabaseServer
      .from('referral_clicks')
      .select('id')
      .eq('referral_code', referral_code.toUpperCase())
      .eq('ip_address', clientIP)
      .gte('created_at', oneHourAgo);

    if (recentError) {
      console.error('Error checking recent clicks:', recentError);
    }

    if (recentClicks && recentClicks.length > 0) {
      // IP already clicked recently, still return success to prevent enumeration
      return NextResponse.json({
        status: 'success',
        message: 'Click tracked (rate limited)',
        data: null
      });
    }

    // Check if referral code exists
    const { data: referralData, error: checkError } = await supabaseServer
      .from('user_referrals')
      .select('id')
      .eq('referral_code', referral_code.toUpperCase())
      .single();

    if (checkError) {
      console.error('Error checking referral code:', checkError);
      return NextResponse.json({
        status: 'success', // Return success to prevent referral code enumeration
        message: 'Click tracked',
        data: null
      });
    }

    // Log the click
    const userAgent = request.headers.get('user-agent') || '';

    const { error: insertError } = await supabaseServer
      .from('referral_clicks')
      .insert({
        referral_code: referral_code.toUpperCase(),
        ip_address: clientIP,
        user_agent: userAgent
      });

    if (insertError) {
      console.error('Error inserting referral click:', insertError);
      // Still return success since the click was technically tracked
    }

    // Update click count in user_referrals table
    const { error: updateError } = await supabaseServer
      .from('user_referrals')
      .update({
        total_clicks: supabaseServer.rpc('increment', { row_id: referralData.id }),
        updated_at: new Date().toISOString()
      })
      .eq('id', referralData.id);

    if (updateError) {
      console.error('Error updating click count:', updateError);
    }

    return NextResponse.json({
      status: 'success',
      message: 'Referral click tracked successfully.',
      data: null
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
