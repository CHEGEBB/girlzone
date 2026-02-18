import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId') || searchParams.get('job_id');
    const userId = searchParams.get('userId');

    if (!jobId) return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    // Just check Supabase — webhook already updated the record when done
    const { createAdminClient } = await import('@/lib/supabase-admin');
    const supabaseAdmin = await createAdminClient();

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from("generated_images")
      .select("id, image_url, status, created_at")
      .eq('job_id', jobId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ status: 'IN_PROGRESS', progress: 10, message: 'Generating video...' });
    }

    if (data.status === 'completed' && data.image_url) {
      return NextResponse.json({
        status: 'COMPLETED',
        video_url: data.image_url,
        provider: 'modelslab'
      });
    }

    if (data.status === 'failed') {
      return NextResponse.json({
        status: 'FAILED',
        error: 'Video generation failed',
        provider: 'modelslab'
      });
    }

    // Still pending - calculate elapsed time for progress
    const createdAt = new Date(data.created_at).getTime();
    const elapsedSeconds = Math.round((Date.now() - createdAt) / 1000);
    const estimatedTime = 90;
    const progress = Math.min(90, Math.round((elapsedSeconds / estimatedTime) * 100));

    // Timeout after 3 minutes
    if (elapsedSeconds > 180) {
      // Mark as failed in DB
      await supabaseAdmin
        .from("generated_images")
        .update({ status: 'failed' })
        .eq('job_id', jobId);

      return NextResponse.json({
        status: 'FAILED',
        error: 'Video generation timed out',
        provider: 'modelslab'
      });
    }

    return NextResponse.json({
      status: 'IN_PROGRESS',
      progress,
      eta: Math.max(5, estimatedTime - elapsedSeconds),
      message: elapsedSeconds > 60 ? 'Almost done, finalizing video...' : 'Generating video...',
      provider: 'modelslab'
    });

  } catch (error) {
    console.error('Error checking video status:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}