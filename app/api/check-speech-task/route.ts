import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const taskId = request.nextUrl.searchParams.get("taskId")

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    // Get the API key from environment variables
    const apiKey = process.env.RUNPOD_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "RunPod API key is not configured" }, { status: 500 })
    }

    console.log("Checking speech task status for task ID:", taskId)

    // Call the RunPod API to check the task status
    const response = await fetch(`https://api.runpod.ai/v2/minimax-speech-02-hd/status/${taskId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("RunPod API error response:", errorText)

      try {
        // Try to parse as JSON if possible
        const errorData = JSON.parse(errorText)
        console.error("Parsed error data:", errorData)
      } catch (parseError) {
        console.error("Could not parse error response as JSON")
      }

      return NextResponse.json(
        { error: `Failed to check speech task: ${response.status} ${response.statusText}` },
        { status: response.status },
      )
    }

    const responseText = await response.text()
    console.log("RunPod API raw response:", responseText)

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Error parsing RunPod API response:", parseError)
      return NextResponse.json({ error: "Invalid response from RunPod API" }, { status: 500 })
    }

    console.log("Parsed RunPod API response:", data)

    // Extract the task status from RunPod response
    const status = data.status || "UNKNOWN"
    
    // Map RunPod statuses to our expected format
    let mappedStatus = "TASK_STATUS_UNKNOWN"
    if (status === "COMPLETED" || status === "SUCCESS") {
      mappedStatus = "TASK_STATUS_SUCCEED"
    } else if (status === "FAILED" || status === "ERROR") {
      mappedStatus = "TASK_STATUS_FAILED"
    } else if (status === "IN_PROGRESS" || status === "RUNNING") {
      mappedStatus = "TASK_STATUS_RUNNING"
    }

    // Check if the task is completed and has audio files
    let audioUrl = null
    if (mappedStatus === "TASK_STATUS_SUCCEED" && data.output && data.output.audio_url) {
      audioUrl = data.output.audio_url
    }

    return NextResponse.json({
      status: mappedStatus,
      audioUrl,
    })
  } catch (error) {
    console.error("Error in check-speech-task API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
