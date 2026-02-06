import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId') || searchParams.get('job_id');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const runpodApiKey = process.env.RUNPOD_API_KEY;
    if (!runpodApiKey) {
      return NextResponse.json(
        { error: 'RunPod API key not configured' },
        { status: 500 }
      );
    }

    // Check video generation status
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

    // Handle different status states
    if (statusData.status === 'COMPLETED') {
      // Extract video from output
      const video = statusData.output?.video;

      if (!video) {
        console.error('No video in completed response:', statusData);
        return NextResponse.json(
          { error: 'Video generation completed but no video was returned' },
          { status: 500 }
        );
      }

      // Import the upload function dynamically to avoid issues
      const { uploadVideoToBunny } = await import('@/lib/cloudinary-upload');
      const videoUrl = await uploadVideoToBunny(video);

      return NextResponse.json({
        status: 'COMPLETED',
        video_url: videoUrl,
        delayTime: statusData.delayTime,
        executionTime: statusData.executionTime,
      });
    } else if (statusData.status === 'FAILED') {
      return NextResponse.json({
        status: 'FAILED',
        error: statusData.error || 'Video generation failed',
      });
    } else {
      // Still in progress (IN_QUEUE, IN_PROGRESS, etc.)
      return NextResponse.json({
        status: statusData.status || 'IN_PROGRESS',
        progress: statusData.progress || 0,
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
