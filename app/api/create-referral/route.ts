import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateReferralCodeFormat, getClientIP } from '@/lib/referral-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Create Referral API Called ===');

    const body = await request.json();
    const { referral_code } = body;

    console.log('Request body:', body);
    console.log('Referral code:', referral_code);

    if (!referral_code) {
      console.log('No referral code provided');
      return NextResponse.json({
        status: 'error',
        message: 'Referral code is required',
        data: null
      }, { status: 400 });
    }

    // Get auth user
    const supabaseServer = createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    console.log('Auth user result:', { user: user?.id, error: authError });

    if (authError || !user) {
      console.log('User not authenticated:', authError);
      return NextResponse.json({
        status: 'error',
        message: 'User not authenticated',
        data: null
      }, { status: 401 });
    }

    // Validate referral code format
    if (!validateReferralCodeFormat(referral_code)) {
      console.log('Invalid referral code format:', referral_code);
      return NextResponse.json({
        status: 'error',
        message: 'Invalid referral code format. Must be 4-12 characters, letters and numbers only.',
        data: null
      }, { status: 400 });
    }

    console.log('Referral code validation passed');

    // Check if user already has a referral code
    console.log('Checking if user', user.id, 'already has referral code');
    const { data: existingCode, error: checkError } = await supabaseServer
      .from('user_referrals')
      .select('id')
      .eq('user_id', user.id)
      .single();

    console.log('Check existing code result:', { data: existingCode, error: checkError });

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing referral code:', checkError);
      return NextResponse.json({
        status: 'error',
        message: 'Database error',
        data: null
      }, { status: 500 });
    }

    if (existingCode) {
      return NextResponse.json({
        status: 'error',
        message: 'User already has a referral code.',
        data: null
      }, { status: 400 });
    }

    // Check if referral code already exists
    console.log('Checking if referral code already exists:', referral_code.toUpperCase());
    const { data: existingCodeCheck, error: uniquenessError } = await supabaseServer
      .from('user_referrals')
      .select('id')
      .eq('referral_code', referral_code.toUpperCase())
      .single();

    console.log('Uniqueness check result:', { data: existingCodeCheck, error: uniquenessError });

    if (uniquenessError && uniquenessError.code !== 'PGRST116') {
      console.error('Error checking referral code uniqueness:', uniquenessError);
      return NextResponse.json({
        status: 'error',
        message: 'Database error',
        data: null
      }, { status: 500 });
    }

    if (existingCodeCheck) {
      console.log('Referral code already exists');
      return NextResponse.json({
        status: 'error',
        message: 'Referral code already exists. Please choose a different one.',
        data: null
      }, { status: 400 });
    }

    console.log('About to insert new referral code');

    // Create the referral code
    const { data, error: insertError } = await supabaseServer
      .from('user_referrals')
      .insert({
        user_id: user.id,
        referral_code: referral_code.toUpperCase(),
        total_clicks: 0,
        total_signups: 0,
        tokens_earned: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating referral code:', insertError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to create referral code',
        data: null
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Referral code created successfully.',
      data: { referral_code: referral_code.toUpperCase() }
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
