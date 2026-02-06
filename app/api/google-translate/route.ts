import { NextRequest, NextResponse } from "next/server"
import { translateText } from "@/lib/google-translate"

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage } = await req.json()

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: "Missing required parameters: text and targetLanguage" }, { status: 400 })
    }

    const translatedText = await translateText(text, targetLanguage, sourceLanguage)

    return NextResponse.json({ translatedText })
  } catch (error) {
    console.error("Translation API error:", error)
    return NextResponse.json({ error: "Failed to translate text" }, { status: 500 })
  }
}
