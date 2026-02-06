import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const {
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
    } = await request.json();

    if (!source_image) {
      return NextResponse.json(
        { error: 'Source image is required' },
        { status: 400 }
      );
    }

    if (!target_image) {
      return NextResponse.json(
        { error: 'Target image is required' },
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
      console.error('RunPod API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to process face swap' },
        { status: 500 }
      );
    }

    const runpodData = await runpodResponse.json();

    // Check if the request was successful
    if (runpodData.status !== "COMPLETED") {
      console.error('Face swap failed:', runpodData);
      return NextResponse.json(
        { error: 'Face swap processing failed' },
        { status: 500 }
      );
    }

    // Extract the result image
    const resultImage = runpodData.output?.image;
    if (!resultImage) {
      console.error('No image in response:', runpodData);
      return NextResponse.json(
        { error: 'No result image generated' },
        { status: 500 }
      );
    }

    console.log('Face swap completed successfully');

    return NextResponse.json({
      success: true,
      resultImage: `data:image/${output_format.toLowerCase()};base64,${resultImage}`,
      status: runpodData.status,
      delayTime: runpodData.delayTime,
      executionTime: runpodData.executionTime,
    });

  } catch (error) {
    console.error('Error in face swap:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
