import { NextRequest, NextResponse } from 'next/server';

async function downloadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageFetcher/1.0)'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to download image: ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      console.error(`URL is not an image: ${contentType}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    let {
      source_image,
      target_image,
      source_indexes = "-1",
      target_indexes = "-1",
      background_enhance = true,
      face_restore = true,
      face_upsample = true,
      upscale = 1,
      codeformer_fidelity = 0.5,
      output_format = "JPEG"
    } = body;

    console.log('🔍 Face swap request received');

    // Validate inputs
    if (!source_image) {
      console.error('❌ Source image missing');
      return NextResponse.json(
        { success: false, error: 'Source image is required' },
        { status: 400 }
      );
    }

    if (!target_image) {
      console.error('❌ Target image missing');
      return NextResponse.json(
        { success: false, error: 'Target image is required' },
        { status: 400 }
      );
    }

    // Handle source image (URL or base64)
    if (typeof source_image === 'string' && source_image.startsWith('http')) {
      console.log('📥 Downloading source image from URL...');
      const downloadedSource = await downloadImageAsBase64(source_image);
      if (!downloadedSource) {
        return NextResponse.json(
          { success: false, error: 'Failed to download source image' },
          { status: 400 }
        );
      }
      source_image = downloadedSource;
      console.log('✅ Source image downloaded successfully');
    }

    // Handle target image (URL or base64)
    if (typeof target_image === 'string' && target_image.startsWith('http')) {
      console.log('📥 Downloading target image from URL...');
      const downloadedTarget = await downloadImageAsBase64(target_image);
      if (!downloadedTarget) {
        return NextResponse.json(
          { success: false, error: 'Failed to download target image' },
          { status: 400 }
        );
      }
      target_image = downloadedTarget;
      console.log('✅ Target image downloaded successfully');
    }

    // Remove data URL prefix if present
    if (typeof source_image === 'string' && source_image.includes('base64,')) {
      source_image = source_image.split('base64,')[1];
    }
    
    if (typeof target_image === 'string' && target_image.includes('base64,')) {
      target_image = target_image.split('base64,')[1];
    }

    // Validate base64 strings
    if (typeof source_image !== 'string' || source_image.length < 100) {
      console.error('❌ Invalid source image data');
      return NextResponse.json(
        { success: false, error: 'Invalid source image data' },
        { status: 400 }
      );
    }

    if (typeof target_image !== 'string' || target_image.length < 100) {
      console.error('❌ Invalid target image data');
      return NextResponse.json(
        { success: false, error: 'Invalid target image data' },
        { status: 400 }
      );
    }

    const runpodApiKey = process.env.RUNPOD_API_KEY;
    if (!runpodApiKey) {
      console.error('❌ RunPod API key missing');
      return NextResponse.json(
        { success: false, error: 'RunPod API key not configured' },
        { status: 500 }
      );
    }

    console.log('🔄 Calling RunPod face swap API...');

    // Call RunPod face swap endpoint
    const runpodResponse = await fetch('https://api.runpod.ai/v2/f5f72j1ier8gy3/runsync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${runpodApiKey}`,
      },
      body: JSON.stringify({
        input: {
          source_image,
          target_image,
          source_indexes,
          target_indexes,
          background_enhance,
          face_restore,
          face_upsample,
          upscale,
          codeformer_fidelity,
          output_format
        },
      }),
    });

    if (!runpodResponse.ok) {
      const errorText = await runpodResponse.text();
      console.error('❌ RunPod API error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to process face swap' },
        { status: 500 }
      );
    }

    const runpodData = await runpodResponse.json();
    console.log('📥 RunPod response received');

    // Check if the request was successful
    if (runpodData.status !== "COMPLETED") {
      console.error('❌ Face swap failed:', runpodData);
      return NextResponse.json(
        { success: false, error: 'Face swap processing failed' },
        { status: 500 }
      );
    }

    // Extract the result image
    const resultImage = runpodData.output?.image;
    if (!resultImage) {
      console.error('❌ No image in response:', runpodData);
      return NextResponse.json(
        { success: false, error: 'No result image generated' },
        { status: 500 }
      );
    }

    console.log('✅ Face swap completed successfully');

    return NextResponse.json({
      success: true,
      resultImage: `data:image/${output_format.toLowerCase()};base64,${resultImage}`,
      status: runpodData.status,
      delayTime: runpodData.delayTime,
      executionTime: runpodData.executionTime,
    });

  } catch (error) {
    console.error('❌ Error in face swap:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}