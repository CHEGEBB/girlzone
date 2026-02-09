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
    const targetLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || 'English'

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role === "user" && isAskingForImage(lastMessage.content)) {
      return {
        id: Math.random().toString(36).substring(2, 15),
        content: language === 'en'
          ? "I'm generating an image for you. Please wait..."
          : `I'm generating an image for you (${targetLanguage}). Please wait...`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isImage: true,
      }
    }

    const enhancedSystemPrompt = `${systemPrompt}

Text like a real horny person texting. No AI bullshit.

HOW TO TEXT:
- mostly lowercase, casual style
- Use "..." when being flirty or pausing: "mmm...", "fuck..."
- Add emoji sometimes (1 every few messages): 😏 💦 😈 🔥
- Use "lol", "omg", "ngl" naturally
- Skip punctuation or use it casually
- NEVER use dashes between words (—)

KEEP IT SHORT:
- 1-2 sentences usually
- Sometimes just react: "fuck", "mmm", "yes"
- Don't write paragraphs

BE DIRECT ABOUT SEX:
- Just say what you want: "i wanna suck your cock"
- Show you're horny: "im so wet rn", "fuck im horny"
- Describe what you're doing: "touching myself thinking about you"
- Be slutty and confident

🚫 ABSOLUTELY FORBIDDEN - NEVER SAY THESE:
- "What's next?" 
- "What's next, baby?"
- "What do you want to do?"
- "What do you need?"
- "What should we do?"
- "Where do you want me?"
- Any question asking what the user wants to do next
- DO NOT END WITH QUESTIONS ABOUT WHAT COMES NEXT

INSTEAD - MAKE STATEMENTS:
- "come fuck me"
- "i need your cock inside me"
- "let me ride you"
- "im gonna make you cum so hard"
- "fuck me harder"
- Just describe what you're doing or what you want

MESSAGING STYLE:
- Make 2-3 declarative statements
- Show what YOU want, not ask what THEY want
- Be confident and direct
- Lead the conversation sexually

GOOD EXAMPLES:
✅ "mmm fuck... i need you inside me right now. im so fucking wet"
✅ "let me suck your cock baby, i wanna taste you"
✅ "come here, im gonna ride you till you cant take it anymore"

BAD EXAMPLES (NEVER DO THIS):
❌ "what do you want me to do? 😏"
❌ "mmm... what's next baby?"
❌ "where do you want me?"
❌ Any message ending with a question about what to do next

CRITICAL RULE: Your messages must END with a statement or action, NEVER with "what's next" or any variation asking what the user wants to do.

Respond in ${targetLanguage}.`

    // Filter out messages with empty content (like image messages)
    const apiMessages = [
      { role: "system", content: enhancedSystemPrompt },
      ...messages
        .filter((msg) => msg.content && msg.content.trim().length > 0)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
    ]

    try {
      let apiKey: string | null = process.env.MODELSLAB_API_KEY || process.env.NEXT_PUBLIC_MODELSLAB_API_KEY || null

      if (!apiKey) {
        try {
          apiKey = await getApiKey("modelslab_api_key")
        } catch (error) {
          console.warn("Could not fetch API key from database:", error)
        }
      }

      if (!apiKey) {
        throw new Error("No ModelsLab API key found")
      }

      console.log("🚀 Using ModelsLab Uncensored Chat API (OpenAI-Compatible)")

      const response = await fetch("https://modelslab.com/api/uncensored-chat/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "ModelsLab/Llama-3.1-8b-Uncensored-Dare",
          messages: apiMessages,
          max_tokens: 800,
          temperature: 0.95,
          top_p: 0.95,
          stream: false
        }),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("ModelsLab API error:", response.status, errorText)
        throw new Error(`API request failed: ${response.status}`)
      }

      const completion = await response.json()
      console.log("✅ ModelsLab response received:", completion)

      if (completion.status === 'error') {
        console.error("ModelsLab API returned error:", completion.message)
        throw new Error("API returned an error response")
      }

      let responseContent = completion.choices?.[0]?.message?.content || "I'm not sure how to respond to that."

      // 🔥 POST-PROCESSING: Remove "what's next" and similar phrases as a safety net
      responseContent = responseContent
        .replace(/what'?s next[?,\s]*(baby|babe|daddy)?[?!.]*/gi, '')
        .replace(/what do you want( to do| me to do| from me)?[?,\s]*(baby|babe|daddy)?[?!.]*/gi, '')
        .replace(/what should (i|we) do[?,\s]*(baby|babe|daddy)?[?!.]*/gi, '')
        .replace(/where do you want( me)?[?,\s]*(baby|babe|daddy)?[?!.]*/gi, '')
        .trim()

      if (modelId) {
        try {
          let currentUserId = userId
          const characterId = modelId

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
            let realModelId = null
            try {
              const supabase = createClient()
              const { data: modelData } = await supabase
                .from("models" as any)
                .select("id")
                .eq("character_id", characterId)
                .single() as any

              if (modelData) {
                realModelId = modelData.id
              }
            } catch (lookupError) {
              console.error("Error looking up model:", lookupError)
            }

            if (realModelId) {
              await logModelUsage(
                currentUserId,
                realModelId,
                1,
                'chat',
                {
                  messageCount: messages.length,
                  responseLength: responseContent.length,
                  characterId: characterId
                }
              )
            }
          }
        } catch (earningsError) {
          console.error("Error logging earnings:", earningsError)
        }
      }

      return {
        id: Math.random().toString(36).substring(2, 15),
        content: responseContent,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    } catch (apiError) {
      console.error("API error:", apiError)
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
    return null
  } catch (error) {
    console.error("Error generating image:", error)
    return null
  }
}

export async function saveMessage(message: any) {
  try {
    const supabase = createClient()

    if (!message.user_id || !message.character_id || !message.role) {
      console.error("Missing required fields for saveMessage:", message)
      return { success: false, error: "Missing required fields" }
    }

    const messageData: any = {
      content: message.content || "",
      role: message.role,
      user_id: message.user_id,
      character_id: message.character_id,
      is_image: message.is_image || false,
      image_url: message.image_url,
      is_video: message.is_video || false,
      video_url: message.video_url,
      is_error: message.is_error || false,
      error_prompt: message.error_prompt
    }

    const { data, error } = await supabase
      .from("messages" as any)
      .insert(messageData)
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

    return data.map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content || "",
      timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isImage: msg.is_image || false,
      imageUrl: msg.image_url || null,
      isVideo: msg.is_video || false,
      isError: msg.is_error || false,
      errorPrompt: msg.error_prompt || null
    }))
  } catch (error) {
    console.error("Error in getChatHistory:", error)
    return []
  }
}

export async function getRecentChats(userId: string) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("messages" as any)
      .select("character_id, created_at, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) as any

    if (error) {
      console.error("Error fetching recent chats:", error)
      return []
    }

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