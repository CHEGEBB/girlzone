import { NextRequest, NextResponse } from 'next/server';

// ModelsLab calls this when video generation is complete
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const prompt = searchParams.get('prompt') || '';

    const body = await request.json();
    console.log("🔔 Webhook received:", JSON.stringify(body, null, 2));

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const videoUrl = body.output?.[0] || body.video || body.future_links?.[0];
    const jobId = body.id?.toString() || body.meta?.id?.toString();
    const status = body.status;

    if (status === 'failed' || status === 'error') {
      // Update the pending record to failed
      const { createAdminClient } = await import('@/lib/supabase-admin');
      const supabaseAdmin = await createAdminClient();
      if (supabaseAdmin && jobId) {
        await supabaseAdmin
          .from("generated_images")
          .update({ status: 'failed' })
          .eq('job_id', jobId)
          .eq('user_id', userId);
      }
      return NextResponse.json({ received: true });
    }

    if (!videoUrl) {
      console.error("❌ No video URL in webhook payload");
      return NextResponse.json({ received: true });
    }

    console.log(`✅ Video ready: ${videoUrl}`);

    // Update the record in Supabase
    const { createAdminClient } = await import('@/lib/supabase-admin');
    const supabaseAdmin = await createAdminClient();

    if (supabaseAdmin) {
      if (jobId) {
        // Update existing pending record
        const { error } = await supabaseAdmin
          .from("generated_images")
          .update({
            image_url: videoUrl,
            status: 'completed'
          })
          .eq('job_id', jobId)
          .eq('user_id', userId);

        if (error) {
          console.error("❌ Failed to update video record:", error);
        } else {
          console.log(`✅ Video record updated in DB for job: ${jobId}`);
        }
      } else {
        // Insert new record if no job_id match
        await supabaseAdmin.from("generated_images").insert({
          user_id: userId,
          image_url: videoUrl,
          prompt: decodeURIComponent(prompt),
          model_used: "modelslab-video",
          media_type: "video",
          status: "completed",
          provider: "modelslab"
        });
        console.log(`✅ New video record saved to DB`);
      }
    }

    return NextResponse.json({ received: true, success: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Also handle GET for verification
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' });
}