import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId') || searchParams.get('job_id');
    const provider = searchParams.get('provider') || 'modelslab';
    const fetchUrl = searchParams.get('fetch_url');
    const futureVideoUrl = searchParams.get('future_video_url'); // Get the pre-generated URL

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking video status - JobID: ${jobId}, Provider: ${provider}`);
    
    // If we have a future_video_url, try to validate it first
    if (futureVideoUrl) {
      console.log(`🎯 Checking future video URL: ${futureVideoUrl}`);
      try {
        const headResponse = await fetch(futureVideoUrl, { method: 'HEAD' });
        if (headResponse.ok) {
          console.log('✅ Future video URL is valid and ready!');
          return NextResponse.json({
            status: 'COMPLETED',
            video_url: futureVideoUrl,
            provider: 'modelslab'
          });
        } else {
          console.log('⏳ Future video URL not ready yet, continuing with polling...');
        }
      } catch (error) {
        console.log('⏳ Future video URL check failed, continuing with polling...');
      }
    }

    // 🔵 MODELSLAB POLLING
    if (provider === 'modelslab') {
      const modelsLabApiKey = process.env.MODELSLAB_API_KEY;
      if (!modelsLabApiKey) {
        return NextResponse.json(
          { error: 'ModelsLab API key not configured' },
          { status: 500 }
        );
      }

      // Construct fetch URL if not provided
      const statusUrl = fetchUrl || `https://modelslab.com/api/v6/video/fetch/${jobId}`;
      
      console.log(`📡 Polling ModelsLab at: ${statusUrl}`);

      try {
        const statusResponse = await fetch(statusUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: modelsLabApiKey,
          }),
        });

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          console.error('ModelsLab status check error:', errorText);
          return NextResponse.json(
            { error: 'Failed to check video generation status' },
            { status: 500 }
          );
        }

        const statusData = await statusResponse.json();
        console.log('📊 ModelsLab Full Response:', JSON.stringify(statusData, null, 2));

        // Handle different response formats
        let videoUrl = null;
        let currentStatus = statusData.status;

        // Check for video in output array
        if (statusData.output && Array.isArray(statusData.output) && statusData.output.length > 0) {
          videoUrl = statusData.output[0];
        } 
        // Check for video as direct property
        else if (statusData.video && typeof statusData.video === 'string' && statusData.video.length > 0) {
          videoUrl = statusData.video;
        }
        // Check for future_links (some models use this)
        else if (statusData.future_links && Array.isArray(statusData.future_links) && statusData.future_links.length > 0) {
          videoUrl = statusData.future_links[0];
        }
        // Check meta.output
        else if (statusData.meta?.output && Array.isArray(statusData.meta.output) && statusData.meta.output.length > 0) {
          videoUrl = statusData.meta.output[0];
        }

        console.log(`📊 Status: ${currentStatus}, Video URL: ${videoUrl ? 'Found' : 'Not found'}`);

        // SUCCESS - Video is ready (status success OR we have a valid video URL)
        if ((currentStatus === 'success' || videoUrl) && videoUrl) {
          console.log('✅ Video generation completed!');
          console.log('🎥 Video URL:', videoUrl);
          
          return NextResponse.json({
            status: 'COMPLETED',
            video_url: videoUrl,
            provider: 'modelslab',
            eta: statusData.eta
          });
        } 
        // FAILED
        else if (currentStatus === 'failed' || currentStatus === 'error') {
          console.error('❌ Video generation failed:', statusData.message || statusData.error);
          return NextResponse.json({
            status: 'FAILED',
            error: statusData.message || statusData.error || 'Video generation failed',
            provider: 'modelslab'
          });
        } 
        // STILL PROCESSING
        else if (currentStatus === 'processing' || currentStatus === 'queued') {
          const eta = statusData.eta || statusData.executionTime || 0;
          const progress = statusData.progress || 50;
          
          console.log(`⏳ Still processing... ETA: ${eta}s, Progress: ${progress}%`);
          
          return NextResponse.json({
            status: 'IN_PROGRESS',
            progress: progress,
            eta: eta,
            provider: 'modelslab'
          });
        }
        // UNKNOWN STATUS - treat as in progress
        else {
          console.log(`⚠️ Unknown status: ${currentStatus}, treating as in-progress`);
          return NextResponse.json({
            status: 'IN_PROGRESS',
            progress: 30,
            provider: 'modelslab'
          });
        }
      } catch (error) {
        console.error('❌ ModelsLab polling error:', error);
        return NextResponse.json(
          { error: 'Failed to check ModelsLab status' },
          { status: 500 }
        );
      }
    }

    // 🟢 RUNPOD POLLING (FALLBACK - LEGACY)
    const runpodApiKey = process.env.RUNPOD_API_KEY;
    if (!runpodApiKey) {
      return NextResponse.json(
        { error: 'No video service available' },
        { status: 500 }
      );
    }

    console.log('🔄 Using RunPod fallback...');

    const statusResponse = await fetch(
      `https://api.runpod.ai/v2/1r3p16wimwa0v2/status/${jobId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${runpodApiKey}`,
        },
      }
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('RunPod status check error:', errorText);
      return NextResponse.json(
        { error: 'Failed to check video generation status' },
        { status: 500 }
      );
    }

    const statusData = await statusResponse.json();

    if (statusData.status === 'COMPLETED') {
      const video = statusData.output?.video;

      if (!video) {
        console.error('No video in completed response:', statusData);
        return NextResponse.json(
          { error: 'Video generation completed but no video was returned' },
          { status: 500 }
        );
      }

      // Import the upload function dynamically
      const { uploadVideoToBunny } = await import('@/lib/cloudinary-upload');
      const videoUrl = await uploadVideoToBunny(video);

      return NextResponse.json({
        status: 'COMPLETED',
        video_url: videoUrl,
        delayTime: statusData.delayTime,
        executionTime: statusData.executionTime,
        provider: 'runpod'
      });
    } else if (statusData.status === 'FAILED') {
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
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}