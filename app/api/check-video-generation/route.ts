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

    // Track elapsed time
    if (!startTimes.has(jobId)) {
      startTimes.set(jobId, Date.now());
    }
    const elapsedTime = Date.now() - startTimes.get(jobId)!;
    const elapsedSeconds = Math.round(elapsedTime / 1000);

    console.log(`🔍 [${elapsedSeconds}s] Checking JobID: ${jobId}`);
    
    // 🔵 MODELSLAB
    if (provider === 'modelslab' && futureVideoUrl) {
      
      // FAST CHECK: Ping the future URL (this is where video ends up)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
        
        const headResponse = await fetch(futureVideoUrl, { 
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (headResponse.ok) {
          const contentType = headResponse.headers.get('content-type');
          const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
          
          // Video is ready if it's actually an MP4 file > 50KB
          if ((contentType?.includes('video') || contentType?.includes('mp4')) && contentLength > 50000) {
            console.log(`✅ [${elapsedSeconds}s] Video ready! Size: ${Math.round(contentLength/1024)}KB`);
            startTimes.delete(jobId);
            
            return NextResponse.json({
              status: 'COMPLETED',
              video_url: futureVideoUrl,
              provider: 'modelslab'
            });
          }
        }
      } catch (error) {
        // Timeout or network error - video not ready yet
      }

      // FALLBACK: Check fetch endpoint status
      const modelsLabApiKey = process.env.MODELSLAB_API_KEY;
      if (modelsLabApiKey) {
        try {
          const statusUrl = fetchUrl || `https://modelslab.com/api/v6/video/fetch/${jobId}`;
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const statusResponse = await fetch(statusUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: modelsLabApiKey }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();

            // Check for failure
            if (statusData.status === 'failed' || statusData.status === 'error') {
              console.error(`❌ [${elapsedSeconds}s] Generation failed:`, statusData.message);
              startTimes.delete(jobId);
              return NextResponse.json({
                status: 'FAILED',
                error: statusData.message || 'Video generation failed',
                provider: 'modelslab'
              });
            }

            // Check if video URL is in the response
            const videoUrl = statusData.output?.[0] || 
                           statusData.video || 
                           statusData.future_links?.[0] ||
                           statusData.meta?.output?.[0];

            if (videoUrl) {
              // Verify the URL is accessible
              try {
                const videoCheck = await fetch(videoUrl, { 
                  method: 'HEAD', 
                  cache: 'no-store',
                  signal: AbortSignal.timeout(3000)
                });
                
                if (videoCheck.ok && videoCheck.headers.get('content-type')?.includes('video')) {
                  console.log(`✅ [${elapsedSeconds}s] Video URL verified!`);
                  startTimes.delete(jobId);
                  return NextResponse.json({
                    status: 'COMPLETED',
                    video_url: videoUrl,
                    provider: 'modelslab'
                  });
                }
              } catch (e) {
                // Video URL not ready yet
              }
            }
          }
        } catch (error) {
          // Fetch endpoint timeout/error
        }
      }

      // Still processing - realistic progress
      const estimatedTime = 90; // 90 seconds typical
      const progress = Math.min(95, Math.round((elapsedSeconds / estimatedTime) * 100));
      
      console.log(`⏳ [${elapsedSeconds}s] Processing... ${progress}%`);
      
      // Timeout after 3 minutes
      if (elapsedSeconds > 180) {
        console.error(`⏱️ [${elapsedSeconds}s] Timeout!`);
        startTimes.delete(jobId);
        return NextResponse.json({
          status: 'FAILED',
          error: 'Video generation timed out after 3 minutes',
          provider: 'modelslab'
        });
      }
      
      return NextResponse.json({
        status: 'IN_PROGRESS',
        progress: progress,
        eta: Math.max(5, estimatedTime - elapsedSeconds),
        message: elapsedSeconds > 60 ? 'Video generation typically takes 60-90 seconds...' : 'Generating video...',
        provider: 'modelslab'
      });
    }

    // 🟢 RUNPOD FALLBACK
    const runpodApiKey = process.env.RUNPOD_API_KEY;
    if (!runpodApiKey) {
      return NextResponse.json({ error: 'No video service available' }, { status: 500 });
    }

    console.log('🔄 Using RunPod fallback...');

    const statusResponse = await fetch(
      `https://api.runpod.ai/v2/1r3p16wimwa0v2/status/${jobId}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${runpodApiKey}` },
      }
    );

    if (!statusResponse.ok) {
      return NextResponse.json({ error: 'Failed to check video status' }, { status: 500 });
    }

    const statusData = await statusResponse.json();

    if (statusData.status === 'COMPLETED') {
      const video = statusData.output?.video;
      if (!video) {
        return NextResponse.json({ error: 'No video in response' }, { status: 500 });
      }

      const { uploadVideoToBunny } = await import('@/lib/cloudinary-upload');
      const videoUrl = await uploadVideoToBunny(video);

      startTimes.delete(jobId);
      return NextResponse.json({
        status: 'COMPLETED',
        video_url: videoUrl,
        provider: 'runpod'
      });
    } else if (statusData.status === 'FAILED') {
      startTimes.delete(jobId);
      return NextResponse.json({
        status: 'FAILED',
        error: statusData.error || 'Video generation failed',
        provider: 'runpod'
      });
    } else {
      return NextResponse.json({
        status: statusData.status || 'IN_PROGRESS',
        progress: statusData.progress || 0,
        provider: 'runpod'
      });
    }

  } catch (error) {
    console.error('Error checking video generation status:', error);
    return NextResponse.json({ error: 'Unexpected error occurred' }, { status: 500 });
  }
}