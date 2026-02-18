import { NextRequest, NextResponse } from 'next/server';

const startTimes = new Map<string, number>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId') || searchParams.get('job_id');
    const provider = searchParams.get('provider') || 'modelslab';
    const fetchUrl = searchParams.get('fetch_url');
    const futureVideoUrl = searchParams.get('future_video_url');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    if (!startTimes.has(jobId)) {
      startTimes.set(jobId, Date.now());
    }
    const elapsedSeconds = Math.round((Date.now() - startTimes.get(jobId)!) / 1000);

    console.log(`🔍 [${elapsedSeconds}s] Checking JobID: ${jobId}`);

    const modelsLabApiKey = process.env.MODELSLAB_API_KEY;
    if (!modelsLabApiKey) {
      return NextResponse.json({ error: 'ModelsLab API key missing' }, { status: 500 });
    }

    const pollUrl = fetchUrl || `https://modelslab.com/api/v6/video/fetch/${jobId}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const statusResponse = await fetch(pollUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: modelsLabApiKey }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!statusResponse.ok) {
        console.warn(`⚠️ [${elapsedSeconds}s] Fetch returned ${statusResponse.status}, retrying...`);
        const progress = Math.min(90, Math.round((elapsedSeconds / 90) * 100));
        return NextResponse.json({ status: 'IN_PROGRESS', progress, message: 'Generating video...', provider });
      }

      const statusData = await statusResponse.json();
      console.log(`📥 [${elapsedSeconds}s] Status:`, JSON.stringify(statusData, null, 2));

      if (statusData.status === 'success') {
        const videoUrl = statusData.output?.[0] || futureVideoUrl;
        if (videoUrl) {
          console.log(`✅ [${elapsedSeconds}s] Video ready: ${videoUrl}`);
          startTimes.delete(jobId);
          return NextResponse.json({ status: 'COMPLETED', video_url: videoUrl, provider });
        }
      }

      if (statusData.status === 'failed' || statusData.status === 'error') {
        console.error(`❌ [${elapsedSeconds}s] Failed:`, statusData.message);
        startTimes.delete(jobId);
        return NextResponse.json({ status: 'FAILED', error: statusData.message || 'Video generation failed', provider });
      }

      if (elapsedSeconds > 300) {
        startTimes.delete(jobId);
        return NextResponse.json({ status: 'FAILED', error: 'Video generation timed out. Please try again.', provider });
      }

      const estimatedTime = 90;
      const progress = Math.min(90, Math.round((elapsedSeconds / estimatedTime) * 100));
      console.log(`⏳ [${elapsedSeconds}s] Processing... ${progress}%`);

      return NextResponse.json({
        status: 'IN_PROGRESS',
        progress,
        eta: Math.max(5, estimatedTime - elapsedSeconds),
        message: elapsedSeconds > 60 ? 'Almost ready, hang tight...' : 'Generating video...',
        provider
      });

    } catch (fetchError: any) {
      console.warn(`⚠️ [${elapsedSeconds}s] Fetch error: ${fetchError.message}, retrying next poll`);
      const progress = Math.min(90, Math.round((elapsedSeconds / 90) * 100));
      return NextResponse.json({ status: 'IN_PROGRESS', progress, message: 'Generating video...', provider });
    }

  } catch (error) {
    console.error('Error checking video generation status:', error);
    return NextResponse.json({ error: 'Unexpected error occurred' }, { status: 500 });
  }
}