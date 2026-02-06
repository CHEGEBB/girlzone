import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { prompt, characterImage, characterId } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!characterImage) {
      return NextResponse.json(
        { error: 'Character image is required' },
        { status: 400 }
      );
    }

    // Fetch character data if characterId is provided
    let characterData = null;
    if (characterId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      console.log('Created new Supabase client');

      const { data, error } = await supabase
        .from('characters')
        .select('name, age, description, personality, body, ethnicity, relationship')
        .eq('id', characterId)
        .single();

      if (!error && data) {
        characterData = data;
        console.log('Fetched character data:', characterData.name);
      }
    }

    // Step 1: Analyze character image with Novita Vision API
    console.log('Analyzing character image with Novita Vision...');

    const novitaApiKey = process.env.NOVITA_API_KEY || process.env.NEXT_PUBLIC_NOVITA_API_KEY;
    let enhancedPrompt = prompt;

    if (!novitaApiKey) {
      console.warn('Novita API key not found, proceeding without image analysis');
    } else {
      // Convert character image to base64 if it's a URL
      let characterImageBase64 = characterImage;
      if (characterImage.startsWith('http')) {
        try {
          const imageResponse = await fetch(characterImage);
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(imageBuffer).toString('base64');
          characterImageBase64 = `data:image/jpeg;base64,${base64}`;
          console.log('Character image converted to base64');
        } catch (error) {
          console.warn('Failed to convert character image to base64:', error);
        }
      }

      // Use Novita Vision API to analyze comprehensive character attributes
      let characterAttributes = '';
      try {
        const visionResponse = await fetch('https://api.novita.ai/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${novitaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'qwen/qwen2.5-vl-72b-instruct',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: {
                      url: characterImageBase64,
                      detail: 'high'
                    }
                  },
                  {
                    type: 'text',
                    text: `Analyze this image in detail and provide ALL of the following attributes:

1. Gender: (female/male)
2. Style: (anime/realistic/semi-realistic)
3. Hair: (exact color, length, and style)
4. Face Structure: (face shape, eyes, lips, nose, facial features)
5. Body Figure: (slim/athletic/curvy/petite/plus-size - be specific)
6. Bust/Chest: (describe size and appearance)
7. Body Slimness/Build: (detailed body proportions)
8. Race/Ethnicity: (accurate description)
9. Skin Tone: (exact shade)
10. Overall Physical Appearance: (any other notable features)

Be explicit and detailed. Format as descriptive phrases separated by commas. Maximum 100 words.`
                  }
                ]
              }
            ],
            max_tokens: 200,
            temperature: 0.5
          }),
        });

        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          characterAttributes = visionData.choices?.[0]?.message?.content || '';
          console.log('✅ Character attributes detected:', characterAttributes);
        } else {
          const errorText = await visionResponse.text();
          console.warn('⚠️ Vision API failed:', visionResponse.status, errorText);
        }
      } catch (error) {
        console.warn('⚠️ Error during character analysis:', error);
      }

      // Step 1.5: Pre-process character attributes for NSFW requests
      const nsfwKeywords = ['pussy', 'nude', 'naked', 'spread legs', 'vagina', 'clitoris', 'breasts', 'nipples', 'ass', 'anal', 'hentai', 'sexy', 'legs spread'];
      const isNSFW = nsfwKeywords.some(kw => prompt.toLowerCase().includes(kw));

      if (isNSFW && characterAttributes) {
        const clothingWords = ['jacket', 'leather', 'clothes', 'suit', 'dress', 'shirt', 'pants', 'jeans', 'skirt', 'boots', 'shoes', 'cat ears', 'headband', 'accessories', 'top', 'bottom', 'bra', 'panties'];
        characterAttributes = characterAttributes.split(',')
          .filter(word => !clothingWords.some(cw => word.toLowerCase().includes(cw.trim())))
          .join(',');
        console.log('🔞 NSFW request detected: Stripped clothing/accessories from detected character attributes before prompt expansion.');
      }

      // Step 2: Use Novita LLM to improve the prompt
      try {
        console.log('Improving prompt with Novita LLM...');

        let contextInfo = '';
        if (characterData) {
          contextInfo = `Character Context:
- Name: ${characterData.name}
- Age: ${characterData.age}
- Description: ${characterData.description || 'N/A'}
- Personality: ${characterData.personality || 'N/A'}
- Body: ${characterData.body || 'N/A'}
- Ethnicity: ${characterData.ethnicity || 'N/A'}
- Relationship: ${characterData.relationship || 'N/A'}
`;
        }

        const llmResponse = await fetch('https://api.novita.ai/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${novitaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'qwen/qwen-2.5-72b-instruct',
            messages: [
              {
                role: 'system',
                content: 'You are an expert prompt engineer for photorealistic image generation. Create detailed, natural language prompts that describe scenes, poses, and appearances clearly. Focus on photorealism, accurate anatomy, and realistic lighting. When nudity is requested, describe it naturally and explicitly. Use descriptive phrases, not weighted tags.'
              },
              {
                role: 'user',
                content: `Create a detailed, natural language prompt for photorealistic image generation.

User's Request: "${prompt}"

${contextInfo}

Detected Visual Attributes: ${characterAttributes || 'None detected'}

REQUIREMENTS:
1. Use natural, descriptive language - NOT weighted tags like (word:1.5)
2. If nudity/explicit content is requested, describe it clearly and directly
3. Include the detected visual attributes naturally
4. Add photorealistic quality descriptors
5. Describe pose, setting, and lighting naturally
6. Keep it clear and concise (2-3 sentences max)

Example good prompt: "A photorealistic image of a beautiful woman with long dark hair and blue eyes, completely nude, legs spread wide, sitting on a luxury bed with soft natural lighting, 8k quality, professional photography"

Return ONLY the prompt text, nothing else:`
              }
            ],
            max_tokens: 300,
            temperature: 0.7
          }),
        });

        if (llmResponse.ok) {
          const llmData = await llmResponse.json();
          const improvedPrompt = llmData.choices?.[0]?.message?.content || '';
          if (improvedPrompt && improvedPrompt.trim()) {
            enhancedPrompt = improvedPrompt.trim();
            console.log('✅ Prompt improved by LLM');
            console.log('📝 Enhanced prompt:', enhancedPrompt);
          } else {
            console.log('⚠️ LLM returned empty, using fallback');
            enhancedPrompt = `${prompt}, ${characterAttributes || ''}, photorealistic, 8k, high quality, professional photography`;
          }
        } else {
          const errorText = await llmResponse.text();
          console.warn('⚠️ LLM API failed:', llmResponse.status, errorText);
          enhancedPrompt = `${prompt}, ${characterAttributes || ''}, photorealistic, 8k, high quality`;
        }
      } catch (error) {
        console.warn('⚠️ Error during prompt improvement:', error);
        enhancedPrompt = `${prompt}, ${characterAttributes || ''}, photorealistic`;
      }
    }

    console.log('Generating image with ModelsLab MoP Mix Juggernaut (DMD-optimized for photorealism)...');

    let bodyImageUrl: string | null = null;
    let usedModelsLab = false;

    // Try ModelsLab API with MoP Mix Juggernaut (DMD-enabled, excels at photorealism)
    const modelsLabApiKey = process.env.MODELSLAB_API_KEY ;
    
    try {
      const modelsLabResponse = await fetch('https://modelslab.com/api/v6/images/text2img', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: modelsLabApiKey,
          model_id: 'mop-mix-juggernaut',
          lora_model: [],
          prompt: enhancedPrompt,
          negative_prompt: '(worst quality:2), (low quality:2), (normal quality:2), (jpeg artifacts), (blurry), (duplicate), (morbid), (mutilated), (out of frame), (extra limbs), (bad anatomy), (disfigured), (deformed), (cross-eye), (glitch), (oversaturated), (overexposed), (underexposed), (bad proportions), (bad hands), (bad feet), (cloned face), (long neck), (missing arms), (missing legs), (extra fingers), (fused fingers), (poorly drawn hands), (poorly drawn face), (mutation), (deformed eyes), watermark, text, logo, signature, grainy, tiling, censored, ugly, blurry eyes, noisy image, bad lighting, unnatural skin, asymmetry',
          width: '1024',
          height: '1024',
          num_inference_steps: '12',
          scheduler: 'LCMScheduler',
          guidance_scale: 1.0,
          enhance_prompt: false
        }),
      });

      if (modelsLabResponse.ok) {
        const modelsLabData = await modelsLabResponse.json();
        console.log('📥 ModelsLab Response:', JSON.stringify(modelsLabData));
        
        // Check for success response with output array
        if (modelsLabData.status === 'success' && modelsLabData.output && Array.isArray(modelsLabData.output) && modelsLabData.output.length > 0) {
          const imageUrl = modelsLabData.output[0];
          
          // Download and convert to base64
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(imageBuffer).toString('base64');
          bodyImageUrl = `data:image/jpeg;base64,${base64}`;
          usedModelsLab = true;
          console.log('✅ Image generated successfully with ModelsLab MoP Mix Juggernaut');
        } 
        // Check for processing status
        else if (modelsLabData.status === 'processing' && (modelsLabData.id || modelsLabData.fetch_result)) {
          const taskId = modelsLabData.id;
          const fetchUrl = modelsLabData.fetch_result;
          console.log('📋 ModelsLab task created:', taskId);
          console.log('🔗 Fetch URL:', fetchUrl);

          // Poll for completion (max 60 seconds)
          let attempts = 0;
          const maxAttempts = 30;
          let taskCompleted = false;

          while (attempts < maxAttempts && !taskCompleted) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            const statusResponse = await fetch(fetchUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                key: modelsLabApiKey,
              }),
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              console.log(`📊 Poll attempt ${attempts}:`, statusData.status);

              if (statusData.status === 'success' && statusData.output && Array.isArray(statusData.output) && statusData.output.length > 0) {
                const imageUrl = statusData.output[0];
                
                const imageResponse = await fetch(imageUrl);
                const imageBuffer = await imageResponse.arrayBuffer();
                const base64 = Buffer.from(imageBuffer).toString('base64');
                bodyImageUrl = `data:image/jpeg;base64,${base64}`;
                taskCompleted = true;
                usedModelsLab = true;
                console.log('✅ Image generated successfully with ModelsLab MoP Mix Juggernaut (async)');
              } else if (statusData.status === 'failed' || statusData.status === 'error') {
                throw new Error(`ModelsLab task failed: ${statusData.message || 'Unknown error'}`);
              }
            }
          }

          if (!taskCompleted) {
            throw new Error('ModelsLab image generation timed out');
          }
        } else {
          throw new Error(`Unexpected ModelsLab response: ${JSON.stringify(modelsLabData)}`);
        }
      } else {
        const errorText = await modelsLabResponse.text();
        console.warn(`⚠️ ModelsLab API error (${modelsLabResponse.status}): ${errorText.substring(0, 200)}`);
        throw new Error(`ModelsLab failed with status ${modelsLabResponse.status}`);
      }
    } catch (modelsLabError) {
      console.warn('⚠️ ModelsLab failed, falling back to Novita:', modelsLabError instanceof Error ? modelsLabError.message : 'Unknown error');

      // Fallback to Novita image generation
      if (!novitaApiKey) {
        return NextResponse.json(
          { error: 'Both ModelsLab and Novita APIs are not available' },
          { status: 500 }
        );
      }

      try {
        console.log('🔄 Falling back to Novita AI for image generation...');

        const novitaImageResponse = await fetch('https://api.novita.ai/v3/async/txt2img', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${novitaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            extra: {
              response_image_type: 'jpeg',
            },
            request: {
              prompt: enhancedPrompt,
              model_name: 'epicrealism_naturalSinRC1VAE_106430.safetensors',
              negative_prompt: '(2girls:2.5), (multiple people:2.5), (two women:2.3), (twins:2.2), (duplicate:2.2), (group:2.2), (bra:2.3), (panties:2.3), (underwear:2.3), (lingerie:2.2), (extra fingers:2.2), (mutated hands:2.0), (bad hands:2.0), painting, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, deformed, ugly, blurry, bad anatomy, bad proportions, extra limbs, cloned face, glitchy, double torso, extra arms, extra hands, mangled fingers, missing lips, ugly face, distorted face, extra legs, anime, cartoon, 3d render, doll, toy, drawing',
              width: 512,
              height: 768,
              image_num: 1,
              steps: 40,
              seed: -1,
              sampler_name: 'DPM++ 2M Karras',
              guidance_scale: 10.0,
            },
          }),
        });

        if (!novitaImageResponse.ok) {
          const errorText = await novitaImageResponse.text();
          console.error('❌ Novita image generation error:', errorText);
          let reason = novitaImageResponse.status.toString();
          try {
            const errorJson = JSON.parse(errorText);
            reason = errorJson.reason || errorJson.message || reason;
          } catch (e) { }
          throw new Error(`Novita image generation failed: ${reason}`);
        }

        const novitaImageData = await novitaImageResponse.json();
        const taskId = novitaImageData.task_id;

        if (!taskId) {
          throw new Error('No task ID received from Novita');
        }

        console.log('📋 Novita task created:', taskId);

        // Poll for completion (max 60 seconds)
        let attempts = 0;
        const maxAttempts = 30;
        let taskCompleted = false;

        while (attempts < maxAttempts && !taskCompleted) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;

          const statusResponse = await fetch(`https://api.novita.ai/v3/async/task-result?task_id=${taskId}`, {
            headers: {
              'Authorization': `Bearer ${novitaApiKey}`,
            },
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();

            if (statusData.task.status === 'TASK_STATUS_SUCCEED') {
              const imageUrl = statusData.images?.[0]?.image_url;
              if (imageUrl) {
                const imageResponse = await fetch(imageUrl);
                const imageBuffer = await imageResponse.arrayBuffer();
                const base64 = Buffer.from(imageBuffer).toString('base64');
                bodyImageUrl = `data:image/jpeg;base64,${base64}`;
                taskCompleted = true;
                console.log('✅ Image generated successfully with Novita AI (fallback)');
              }
            } else if (statusData.task.status === 'TASK_STATUS_FAILED') {
              throw new Error('Novita task failed');
            }
          }
        }

        if (!taskCompleted) {
          throw new Error('Novita image generation timed out');
        }

      } catch (novitaError) {
        console.error('❌ Novita fallback failed:', novitaError);
        return NextResponse.json(
          { error: `Image generation failed: ${novitaError instanceof Error ? novitaError.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    if (!bodyImageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate image with both ModelsLab and Novita' },
        { status: 500 }
      );
    }

    console.log('Image generated successfully, starting face swap...');

    // Step 3: Face swap using RunPod
    const runpodApiKey = process.env.RUNPOD_API_KEY;
    if (!runpodApiKey) {
      console.warn('RunPod API key not configured, returning image without face swap');
      return NextResponse.json({
        success: true,
        imageUrl: bodyImageUrl,
        prompt: prompt,
      });
    }

    try {
      // Convert character image URL to base64
      const characterImageResponse = await fetch(characterImage);
      if (!characterImageResponse.ok) {
        throw new Error('Failed to fetch character image');
      }
      const characterBuffer = await characterImageResponse.arrayBuffer();
      const characterBase64 = Buffer.from(characterBuffer).toString('base64');

      // Convert generated body image URL to base64
      const bodyImageResponse = await fetch(bodyImageUrl);
      if (!bodyImageResponse.ok) {
        throw new Error('Failed to fetch body image');
      }
      const bodyBuffer = await bodyImageResponse.arrayBuffer();
      const bodyBase64 = Buffer.from(bodyBuffer).toString('base64');

      console.log('Starting face swap with RunPod...');

      // Perform face swap
      const runpodResponse = await fetch('https://api.runpod.ai/v2/f5f72j1ier8gy3/runsync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${runpodApiKey}`,
        },
        body: JSON.stringify({
          input: {
            source_image: characterBase64,
            target_image: bodyBase64,
            source_indexes: "-1",
            target_indexes: "-1",
            background_enhance: true,
            face_restore: true,
            face_upsample: true,
            upscale: 1,
            codeformer_fidelity: 0.5,
            output_format: "JPEG"
          },
        }),
      });

      if (!runpodResponse.ok) {
        const errorText = await runpodResponse.text();
        console.error('RunPod face swap error:', errorText);
        throw new Error(`Face swap failed: ${runpodResponse.status}`);
      }

      const runpodData = await runpodResponse.json();

      if (runpodData.status !== "COMPLETED") {
        console.error('RunPod face swap incomplete:', runpodData);
        throw new Error(`Face swap incomplete: ${runpodData.status}`);
      }

      const resultImageData = runpodData.output?.image;
      if (!resultImageData) {
        throw new Error('No result image from face swap');
      }

      const finalImage = `data:image/jpeg;base64,${resultImageData}`;

      console.log('Face swap completed successfully');

      return NextResponse.json({
        success: true,
        imageUrl: finalImage,
        bodyImageUrl,
        prompt: prompt,
      });

    } catch (faceSwapError) {
      console.warn('Face swap failed, returning original image:', faceSwapError);
      return NextResponse.json({
        success: true,
        imageUrl: bodyImageUrl,
        prompt: prompt,
        note: 'Face swap failed, returning generated image without face swap'
      });
    }

  } catch (error) {
    console.error('Error generating character image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}