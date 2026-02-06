import { NextResponse } from "next/server"
import { getUpgateConfig } from "@/lib/upgate-utils"

export async function POST() {
  try {
    const config = await getUpgateConfig()
    
    // Check if API key is configured
    if (!config.apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Upgate API key is not configured. Please add your API key in the settings."
        },
        { status: 400 }
      )
    }

    // Try to make a simple API call to verify the connection
    try {
      const response = await fetch(`${config.baseUrl}/transaction?limit=1`, {
        method: "GET",
        headers: {
          "X-Api-Key": config.apiKey,
        },
      })

      if (response.ok) {
        return NextResponse.json({
          success: true,
          message: `Successfully connected to Upgate (${config.status} mode)`,
        })
      } else {
        const errorText = await response.text()
        return NextResponse.json(
          {
            success: false,
            message: `Connection failed: ${response.statusText}. ${errorText || 'Please check your API key.'}`,
          },
          { status: 400 }
        )
      }
    } catch (fetchError) {
      return NextResponse.json(
        {
          success: false,
          message: fetchError instanceof Error ? fetchError.message : "Network error - could not reach Upgate API",
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error testing Upgate connection:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to test connection"
      },
      { status: 500 }
    )
  }
}
