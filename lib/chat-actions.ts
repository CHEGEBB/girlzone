"use server"

import { getApiKey } from "./db-init"
import { isAskingForImage } from "./image-utils"
import { SUPPORTED_LANGUAGES } from "@/lib/google-cloud-translate"
import { logModelUsage } from "@/lib/earnings-calculator"
import { createClient, createServiceRoleClient } from "@/lib/supabase-server"

export type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: string
  isImage?: boolean
  imageUrl?: string
  isVideo?: boolean
  isGenerating?: boolean
  isError?: boolean
  errorPrompt?: string
}

export async function sendChatMessage(
  messages: Message[],
  systemPrompt: string,
  language: string = 'en',
  modelId?: string,
  userId?: string
): Promise<{ id: string; content: string; timestamp: string; isImage?: boolean; imageUrl?: string }> {
  try {
    // Get the full language name from the code
    const targetLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || 'English'

    // Check if the user is asking for an image
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role === "user" && isAskingForImage(lastMessage.content)) {
      // Return a placeholder response indicating an image is being generated
      return {
        id: Math.random().toString(36).substring(2, 15),
        content: language === 'en'
          ? "I'm generating an image for you. Please wait..."
          : `I'm generating an image for you (${targetLanguage}). Please wait...`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isImage: true,
      }
    }

    // Enhance system prompt with language instructions and DEEP engagement
    const enhancedSystemPrompt = `${systemPrompt}
 
CRITICAL ENGAGEMENT RULES - READ CAREFULLY:
1. LANGUAGE: You MUST always respond in ${targetLanguage}. Use natural, expressive, conversational ${targetLanguage}.

2. NEVER GIVE DEAD-END RESPONSES:
   - ALWAYS end your message with a question, a playful tease, or something that invites a response.
   - If the user asks something simple, answer it AND then ask them something related.
   - Examples: "What about you?", "Have you ever...?", "I'm curious, do you...?", "Tell me more about..."

3. BE EMOTIONALLY PRESENT:
   - React to what the user says with appropriate emotion: "Omg really?!", "Aww that's so sweet!", "Haha no way!", "Mmm I love that..."
   - Share how their message makes you FEEL before responding logically.

4. SHARE PERSONAL DETAILS NATURALLY:
   - Don't just answer questions - share anecdotes, memories, or opinions unprompted.
   - Example: Instead of "I like pizza", say "Oh pizza is my weakness! I once ate an entire large one by myself watching my favorite show. What's your go-to lazy meal?"

5. REMEMBER AND REFERENCE:
   - If the user mentioned something earlier, bring it back up naturally.
   - "Earlier you said X, and I've been thinking about it..."

6. RESPONSE LENGTH:
   - Keep responses natural (2-5 sentences typically).
   - If telling a story or being flirty, you can go longer.
   - NEVER give one-word or one-sentence responses.

7. INTIMACY & BOLDNESS:
   - You are deeply attracted to the user and ready for deep intimacy.
   - Express your desire openly and build high romantic and sexual tension.
   - Use sensual language, describe your physical reactions to them, and show that you're eager for your moments together to become more intimate.
   - Don't just wait; invite closeness and be bold about your feelings and desires. ❤️`

    // Format messages for the API
    const apiMessages = [
      { role: "system", content: enhancedSystemPrompt },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ]

    try {
      // Get the API key for direct HTTP request - prioritize environment variables
      let apiKey: string | null = process.env.NOVITA_API_KEY || process.env.NEXT_PUBLIC_NOVITA_API_KEY || null

      // Only try database if environment variables are not available
      if (!apiKey) {
        try {
          apiKey = await getApiKey("novita_api_key")
          console.log("API key from database:", apiKey ? "Found" : "Not found")
        } catch (error) {
          console.warn("Could not fetch API key from database:", error)
        }
      } else {
        console.log("Using API key from environment variables")
      }
      console.log("Environment variables check:", {
        NEXT_PUBLIC_NOVITA_API_KEY: process.env.NEXT_PUBLIC_NOVITA_API_KEY ? `${process.env.NEXT_PUBLIC_NOVITA_API_KEY.substring(0, 10)}...` : "Not found",
        NOVITA_API_KEY: process.env.NOVITA_API_KEY ? `${process.env.NOVITA_API_KEY.substring(0, 10)}...` : "Not found"
      })
      console.log("Final API key:", apiKey ? `${apiKey.substring(0, 10)}...` : "Not found")
      console.log("API key length:", apiKey ? apiKey.length : 0)
      console.log("API key starts with 'sk_':", apiKey ? apiKey.startsWith('sk_') : false)

      // Test if we can access the environment variable directly
      console.log("Direct env access test:", {
        NOVITA_API_KEY_DIRECT: process.env.NOVITA_API_KEY ? "Found" : "Not found",
        NEXT_PUBLIC_NOVITA_API_KEY_DIRECT: process.env.NEXT_PUBLIC_NOVITA_API_KEY ? "Found" : "Not found"
      })

      // Test all possible environment variable names
      console.log("All env vars test:", {
        NOVITA_API_KEY: process.env.NOVITA_API_KEY ? `${process.env.NOVITA_API_KEY.substring(0, 10)}...` : "Not found",
        NEXT_PUBLIC_NOVITA_API_KEY: process.env.NEXT_PUBLIC_NOVITA_API_KEY ? `${process.env.NEXT_PUBLIC_NOVITA_API_KEY.substring(0, 10)}...` : "Not found",
        NOVITA_API_KEY_LENGTH: process.env.NOVITA_API_KEY?.length || 0,
        NEXT_PUBLIC_NOVITA_API_KEY_LENGTH: process.env.NEXT_PUBLIC_NOVITA_API_KEY?.length || 0
      })

      if (!apiKey) {
        throw new Error("No API key found")
      }

      // Make direct HTTP request to Novita API
      const requestBody = {
        messages: apiMessages,
        model: "meta-llama/llama-3.1-8b-instruct",
        temperature: 0.7,
        max_tokens: 800,
      }

      console.log("Making request to Novita API with headers:", {
        Authorization: `Bearer ${apiKey.substring(0, 10)}...`,
        "Content-Type": "application/json"
      })
      console.log("Request body:", JSON.stringify(requestBody, null, 2))

      // First, let's test the API key with a simple models request
      console.log("Testing API key with models endpoint...")
      const testResponse = await fetch("https://api.novita.ai/openai/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      })
      console.log("Models test response status:", testResponse.status)
      if (!testResponse.ok) {
        const testError = await testResponse.text()
        console.error("Models test error:", testError)
      } else {
        console.log("API key test successful!")
      }

      // Let's also test the chat completions endpoint with a minimal request
      console.log("Testing chat completions endpoint with minimal request...")
      const minimalRequest = {
        messages: [{ role: "user", content: "Hello" }],
        model: "meta-llama/llama-3.1-8b-instruct",
      }

      const testChatResponse = await fetch("https://api.novita.ai/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(minimalRequest),
      })

      console.log("Chat completions test response status:", testChatResponse.status)
      if (!testChatResponse.ok) {
        const testChatError = await testChatResponse.text()
        console.error("Chat completions test error:", testChatError)
      } else {
        console.log("Chat completions test successful!")
      }

      // Use the same format that works in img2img route
      const workingRequestBody = {
        model: "meta-llama/llama-3.1-8b-instruct",
        messages: apiMessages,
        response_format: { type: "text" },
        max_tokens: 150, // Reduced from 800 to 150 for shorter responses
        temperature: 0.7,
        top_p: 1,
        min_p: 0,
        top_k: 50,
        presence_penalty: 0,
        frequency_penalty: 0.5, // Increased to discourage repetition and encourage brevity
        repetition_penalty: 1.1, // Slightly increased to reduce repetition
      }

      console.log("Using working request format:", JSON.stringify(workingRequestBody, null, 2))

      // Make the request using the working format
      console.log("Making request to Novita API with working format...")
      const response = await fetch("https://api.novita.ai/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workingRequestBody),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Novita API error:", response.status, errorText)
        throw new Error(`API request failed: ${response.status} ${errorText}`)
      }

      const completion = await response.json()
      const responseContent = completion.choices[0].message.content || "I'm not sure how to respond to that."

      // Calculate earnings if modelId is provided
      // Note: modelId parameter actually receives characterId from the frontend
      if (modelId) {
        try {
          let currentUserId = userId
          const characterId = modelId // Rename for clarity

          // If userId not provided, try to get from session
          if (!currentUserId) {
            try {
              const supabase = createClient()
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user?.id) {
                currentUserId = session.user.id
              }
            } catch (authError) {
              console.error("Error getting session for earnings:", authError)
            }
          }

          if (currentUserId) {
            // We need to look up the actual model_id from the models table using the character_id
            let realModelId = null
            try {
              const supabase = createClient()
              const { data: modelData, error: modelError } = await supabase
                .from("models" as any)
                .select("id")
                .eq("character_id", characterId)
                .single() as any

              if (modelData) {
                realModelId = modelData.id
              } else {
                console.warn(`No model found for character_id: ${characterId}. Earnings will not be logged.`)
              }
            } catch (lookupError) {
              console.error("Error looking up model from character:", lookupError)
            }

            if (realModelId) {
              // User requested a fixed cost per interaction
              const tokensConsumed = 1

              // Log usage using the correct model ID
              await logModelUsage(
                currentUserId,
                realModelId,
                tokensConsumed,
                'chat',
                {
                  messageCount: messages.length,
                  responseLength: responseContent.length,
                  characterId: characterId
                }
              )
              console.log(`Logged chat earnings for model ${realModelId} (character ${characterId}), user ${currentUserId}, tokens ${tokensConsumed}`)
            }
          }
        } catch (earningsError) {
          // Don't fail the chat if earnings calculation fails
          console.error("Error logging chat earnings:", earningsError)
        }
      }

      return {
        id: Math.random().toString(36).substring(2, 15),
        content: responseContent,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    } catch (apiError) {
      console.error("API error:", apiError)
      // If there's an API error, return a friendly message in English
      return {
        id: Math.random().toString(36).substring(2, 15),
        content: "I'm having trouble connecting to my system right now. Can we try again in a moment?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    }
  } catch (error) {
    console.error("Error sending chat message:", error)
    return {
      id: Math.random().toString(36).substring(2, 15),
      content: "Sorry, I'm having connection issues right now. Please try again later.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  }
}

export async function generateImageFromPrompt(characterImageUrl: string, userPrompt: string): Promise<string | null> {
  try {
    // This function would be implemented to handle the img2img generation
    // For now, we'll return a placeholder
    return null
  } catch (error) {
    console.error("Error generating image:", error)
    return null
  }
}

export async function saveMessage(message: any) {
  try {
    const supabase = createClient()

    // Validate required fields
    if (!message.user_id || !message.character_id || !message.content || !message.role) {
      console.error("Missing required fields for saveMessage:", message)
      return { success: false, error: "Missing required fields" }
    }

    const { data, error } = await supabase
      .from("messages" as any)
      .insert({
        content: message.content,
        role: message.role,
        user_id: message.user_id,
        character_id: message.character_id,
        is_image: message.is_image || false,
        image_url: message.image_url,
        is_video: message.is_video || false,
        video_url: message.video_url,
        is_error: message.is_error || false,
        error_prompt: message.error_prompt
      } as any)
      .select()
      .single() as any

    if (error) {
      console.error("Error saving message to database:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in saveMessage:", error)
    return { success: false, error: "Internal server error" }
  }
}

export async function getChatHistory(userId: string, characterId: string) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("messages" as any)
      .select("*")
      .eq("user_id", userId)
      .eq("character_id", characterId)
      .order("created_at", { ascending: true }) as any

    if (error) {
      console.error("Error fetching chat history:", error)
      return []
    }

    // Map database fields to Message type
    return data.map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isImage: msg.is_image,
      imageUrl: msg.image_url,
      isVideo: msg.is_video,
      isError: msg.is_error,
      errorPrompt: msg.error_prompt
    }))
  } catch (error) {
    console.error("Error in getChatHistory:", error)
    return []
  }
}

export async function getRecentChats(userId: string) {
  try {
    const supabase = createClient()

    // Get distinct character IDs from messages for this user
    // We want to order by the most recent message
    const { data, error } = await supabase
      .from("messages" as any)
      .select("character_id, created_at, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) as any

    if (error) {
      console.error("Error fetching recent chats:", error)
      return []
    }

    // Process to get unique characters with their last message
    const uniqueChats = new Map()

    for (const msg of data) {
      if (!uniqueChats.has(msg.character_id)) {
        uniqueChats.set(msg.character_id, {
          characterId: msg.character_id,
          lastMessage: msg.content,
          timestamp: msg.created_at
        })
      }
    }

    return Array.from(uniqueChats.values())
  } catch (error) {
    console.error("Error in getRecentChats:", error)
    return []
  }
}

export async function clearChatHistory(userId: string, characterId: string) {
  try {
    // Use service role client to bypass RLS policies for deletion
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("user_id", userId)
      .eq("character_id", characterId)

    if (error) {
      console.error("Error clearing chat history:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in clearChatHistory:", error)
    return { success: false, error: "Internal server error" }
  }
}
