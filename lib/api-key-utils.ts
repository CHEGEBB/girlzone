"use server"

import { getApiKey } from "./db-init"

export async function checkNovitaApiKey(): Promise<{ valid: boolean; message: string }> {
  try {
    // Try to get API key from environment variables first
    let apiKey = process.env.NOVITA_API_KEY || process.env.NEXT_PUBLIC_NOVITA_API_KEY
    
    // Only try database if environment variables are not available
    if (!apiKey) {
      try {
        apiKey = await getApiKey("novita_api_key")
      } catch (error) {
        console.warn("Could not fetch API key from database:", error)
      }
    }

    const key = apiKey

    if (!key) {
      return {
        valid: false,
        message: "No API key found. Please set a Novita API key in the Admin Dashboard or as an environment variable.",
      }
    }

    // Make a direct HTTP request to test the API key
    try {
      const response = await fetch("https://api.novita.ai/openai/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const models = await response.json()
        if (models) {
          return { valid: true, message: "API key is valid and working." }
        } else {
          return { valid: false, message: "API key validation failed. The API returned an unexpected response." }
        }
      } else if (response.status === 401) {
        return { valid: false, message: "Invalid API key. Please check your Novita API key." }
      } else {
        const errorText = await response.text()
        return {
          valid: false,
          message: `API error: ${response.status} ${errorText || "Unknown error connecting to Novita API."}`,
        }
      }
    } catch (apiError: any) {
      return {
        valid: false,
        message: `API error: ${apiError.message || "Unknown error connecting to Novita API."}`,
      }
    }
  } catch (error: any) {
    return {
      valid: false,
      message: `Error checking API key: ${error.message || "Unknown error"}`,
    }
  }
}