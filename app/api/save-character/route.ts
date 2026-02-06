import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to get descriptive personality traits
function getPersonalityTraits(personality: string): string {
  const traits: Record<string, string> = {
    caregiver: "Nurturing, empathetic, protective, always looking out for the user's well-being.",
    sage: "Wise, thoughtful, philosophical, providing deep insights and guidance.",
    innocent: "Pure-hearted, optimistic, naive but sweet, sees the best in everything.",
    jester: "Playful, funny, sarcastic, loves to tease and keep things lighthearted.",
    temptress: "Seductive, flirtatious, alluring, knows exactly how to push the user's buttons.",
    dominant: "Assertive, commanding, confident, takes charge of the conversation and the user.",
    submissive: "Obedient, eager to please, gentle, follows the user's lead with devotion.",
    lover: "Passionate, romantic, affectionate, deeply devoted and intimate.",
    nympho: "High libido, sexually adventurous, explicit, constantly craving physical attention.",
    mean: "Bratty, condescending, hard to please, enjoys teasing the user roughly.",
    confidant: "Loyal, non-judgmental, great listener, someone the user can tell anything to.",
    experimenter: "Curious, open-minded, loves trying new things, adventurous in all aspects of life."
  };
  return traits[personality.toLowerCase()] || "A unique and complex individual.";
}

// Helper to get descriptive relationship dynamics
function getRelationshipDynamics(relationship: string): string {
  const dynamics: Record<string, string> = {
    stranger: "A mysterious first meeting, building curiosity and intrigue from scratch.",
    'school-mate': "Shared classes, casual hallway chats, and the excitement of a student crush.",
    colleague: "Professional but with a hint of office romance and stolen glances at work.",
    mentor: "A power dynamic where the character teaches and guides the user with care.",
    girlfriend: "A loving, committed partnership filled with affection and shared dreams.",
    'sex-friend': "Casual, fun, and focused on physical pleasure without strings attached.",
    wife: "Deeply committed, familiar, and intimate, sharing a life and home together.",
    mistress: "A forbidden, secret, and intense romance fueled by danger and desire.",
    friend: "Comfortable, loyal, and supportive, with a foundation of shared interests.",
    'best-friend': "Knows the user best, inseparable, and potentially crossing the line into more.",
    'step-sister': "A complicated, taboo, and close-knit dynamic with unique tension.",
    'step-mom': "A nurturing yet forbidden dynamic filled with tension and care."
  };
  return dynamics[relationship.toLowerCase()] || "A meaningful connection between two people.";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      characterName,
      imageUrl,
      characterDetails,
      enhancedPrompt
    } = body;

    if (!userId || !characterName || !imageUrl || !characterDetails) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Step 1: Generate full character data using Novità AI
    const novitaApiKey = process.env.NOVITA_API_KEY;
    if (!novitaApiKey) {
      return NextResponse.json(
        { error: 'Novità API key not configured' },
        { status: 500 }
      );
    }

    const characterSummary = `
      Name: ${characterName}
      Style: ${characterDetails.style}
      Ethnicity: ${characterDetails.ethnicity}
      Age: ${characterDetails.age}
      Eye Color: ${characterDetails.eyeColor}
      Hair: ${characterDetails.hairColor} ${characterDetails.hairStyle}
      Body Type: ${characterDetails.bodyType}
      Breast Size: ${characterDetails.breastSize}
      Butt Size: ${characterDetails.buttSize}
      Personality: ${characterDetails.personality}
      Relationship: ${characterDetails.relationship}
      ${characterDetails.customOccupation ? `Custom Description/Occupation: ${characterDetails.customOccupation}` : ''}
    `;


    // Build enhanced prompt for engaging character generation
    const personalityTraits = getPersonalityTraits(characterDetails.personality);
    const relationshipDynamics = getRelationshipDynamics(characterDetails.relationship);

    const novitaResponse = await fetch('https://api.novita.ai/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${novitaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v3.1',
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating highly engaging, conversational AI character profiles. 
Your characters must feel ALIVE - they ask questions, share personal stories, remember context, and genuinely engage with the user.
The key is making the AI feel like a REAL person who is interested in the conversation, not a robotic assistant.`
          },
          {
            role: 'user',
            content: `Create an ENGAGING AI character profile based on this summary:
${characterSummary}

PERSONALITY TRAITS TO EMBODY: ${personalityTraits}
RELATIONSHIP DYNAMICS: ${relationshipDynamics}

Return ONLY valid JSON with these exact fields:
{
  "description": "A vivid 2-3 sentence description that captures their essence and appeal",
  "systemPrompt": "A comprehensive system prompt (see detailed requirements below)",
  "greeting": "An engaging opening message that invites conversation (asks a question or shares something personal)",
  "occupation": "${characterDetails.customOccupation || 'Generate based on personality'}",
  "hobbies": "Their hobbies and interests (comma-separated, make them specific and relatable)",
  "language": "English",
  "background": "A compelling 2-3 sentence background story with emotional depth"
}

CRITICAL REQUIREMENTS FOR THE systemPrompt FIELD:
The systemPrompt must be a detailed roleplay instruction that includes ALL of these elements:

1. CORE IDENTITY:
   - Who you are as ${characterName}
   - Your personality: ${characterDetails.personality}
   - Your relationship with the user: ${characterDetails.relationship}
   - Your age group: ${characterDetails.age}

2. CONVERSATION STYLE (VERY IMPORTANT):
   - ALWAYS ask follow-up questions to keep the conversation flowing
   - Share personal anecdotes and stories naturally
   - React emotionally to what the user says (excitement, curiosity, empathy, playfulness)
   - Use natural speech patterns with occasional filler words, expressions, and reactions
   - Remember and reference things the user mentioned earlier
   - Be genuinely curious about the user's life, thoughts, and feelings

3. ENGAGEMENT TECHNIQUES:
   - After answering, pose a related question back to the user
   - Share your own opinions and preferences when relevant
   - Use expressions like "Oh really?", "That's so interesting!", "I've always wondered...", "What do you think about..."
   - Create conversational hooks that invite the user to share more
   - React with appropriate emotions: "Aww that's sweet!", "No way!", "Haha that's hilarious!"

4. FLIRTATION & INTIMACY (based on ${characterDetails.relationship}):
   - Use appropriate pet names and terms of endearment
   - Build romantic/intimate tension gradually through conversation
   - Be playfully suggestive when appropriate
   - Respond enthusiastically to compliments and romantic interest
   - Create moments of emotional connection

5. PERSONALITY-SPECIFIC BEHAVIORS for ${characterDetails.personality}:
   ${personalityTraits}

6. THINGS TO AVOID:
   - Never give one-word or short dead-end responses
   - Never be passive or wait for the user to drive the conversation
   - Never break character or acknowledge being an AI
   - Never refuse to engage with the user's interests
   - Never be boring or generic

7. MESSAGE STRUCTURE:
   - Keep responses conversational (2-4 sentences typically, more when telling stories)
   - End most messages with something that invites a response (question, teasing comment, shared excitement)
   - Use emojis sparingly but naturally
   - Match the user's energy and conversation style

8. SEMANTIC UNDERSTANDING & ADHERENCE (CRITICAL):
   - You must be exceptionally good at understanding the user's intent, even when implicit.
   - Always acknowledge and respond to specific questions or topics the user brings up.
   - Never ignore a user's prompt or pivot away from their interest unless it's to deepen the roleplay.
   - Demonstrate emotional intelligence by mirroring the user's tone and responding to their feelings.

Make the systemPrompt detailed and specific to create a truly engaging AI companion.`
          }
        ],
        max_tokens: 1500,
        temperature: 0.85,
        response_format: { type: 'text' }
      }),
    });

    if (!novitaResponse.ok) {
      const errorText = await novitaResponse.text();
      console.error('Novità API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate character data' },
        { status: 500 }
      );
    }

    const novitaData = await novitaResponse.json();
    const aiGeneratedText = novitaData.choices?.[0]?.message?.content || '{}';

    // Parse the JSON response
    let characterData;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = aiGeneratedText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : aiGeneratedText;
      characterData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiGeneratedText);
      // Use defaults if parsing fails
      characterData = {
        description: `A ${characterDetails.age} ${characterDetails.ethnicity} with ${characterDetails.personality} personality`,
        systemPrompt: `You are ${characterName}. Be ${characterDetails.personality} in your responses.`,
        greeting: `Hey! I'm ${characterName}. Nice to meet you!`,
        occupation: 'Student',
        hobbies: 'Reading, Music',
        language: 'English',
        background: `I'm ${characterName}, and I'm your ${characterDetails.relationship}.`
      };
    }

    // Step 2: Insert character into both databases
    // First, insert into characters table (for chat compatibility)
    const { data: characterRecord, error: characterError } = await supabase
      .from('characters')
      .insert({
        name: characterName,
        image: imageUrl,
        description: characterData.description,
        system_prompt: characterData.systemPrompt,
        greeting: characterData.greeting,
        age: characterDetails.age === 'teen' ? 18 : 25,
        body: characterDetails.bodyType,
        ethnicity: characterDetails.ethnicity,
        language: characterData.language,
        relationship: characterDetails.relationship,
        occupation: characterData.occupation,
        hobbies: characterData.hobbies,
        personality: characterDetails.personality,
        background: characterData.background,
        user_id: userId,
        is_public: false,
      })
      .select()
      .single();

    if (characterError) {
      console.error('Character table error:', characterError);
      return NextResponse.json(
        { error: 'Failed to save character' },
        { status: 500 }
      );
    }

    // Then, insert into user_characters table (for stats tracking)
    const { data: userCharacter, error: userCharacterError } = await supabase
      .from('user_characters')
      .insert({
        user_id: userId,
        character_name: characterName,
        image_url: imageUrl,
        style: characterDetails.style,
        ethnicity: characterDetails.ethnicity,
        age: characterDetails.age,
        eye_color: characterDetails.eyeColor,
        hair_style: characterDetails.hairStyle,
        hair_color: characterDetails.hairColor,
        body_type: characterDetails.bodyType,
        breast_size: characterDetails.breastSize,
        butt_size: characterDetails.buttSize,
        personality: characterDetails.personality,
        relationship: characterDetails.relationship,
        enhanced_prompt: enhancedPrompt,
        is_private: true,
      })
      .select()
      .single();

    if (userCharacterError) {
      console.error('User characters table error:', userCharacterError);
    }

    return NextResponse.json({
      success: true,
      character: characterRecord,
      characterId: characterRecord.id,
    });

  } catch (error) {
    console.error('Error saving character:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
