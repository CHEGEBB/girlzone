import { type NextRequest, NextResponse } from "next/server"

// ModelsLab Configuration
const MODELSLAB_API_KEY = process.env.MODELSLAB_API_KEY ;

// Novita Configuration
const NOVITA_API_KEY = process.env.NEXT_PUBLIC_NOVITA_API_KEY

type NovitaTaskResultResponse = {
  extra: {
    seed: string
    debug_info: {
      request_info: string
      submit_time_ms: string
      execute_time_ms: string
      complete_time_ms: string
    }
  }
  task: {
    task_id: string
    task_type: string
    status: string
    reason: string
    eta: number
    progress_percent: number
  }
  images: {
    image_url: string
    image_url_ttl: string
    image_type: string
  }[]
  videos: any[]
  audios: any[]
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get("taskId")

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    console.log(`🔍 Checking status for task: ${taskId}`)

    // Determine which service based on task ID prefix
    const isModelsLab = taskId.startsWith("modelslab_")
    const actualTaskId = taskId.replace(/^(modelslab_|novita_)/, "")

    if (isModelsLab) {
      // Check ModelsLab status
      console.log("📡 Checking ModelsLab status...")
      
      try {
        // ModelsLab uses POST request with key and request_id in body
        const response = await fetch("https://modelslab.com/api/v7/images/fetch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: MODELSLAB_API_KEY,
            request_id: actualTaskId
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`ModelsLab API error (${response.status}):`, errorText)
          return NextResponse.json({
            status: "TASK_STATUS_FAILED",
            reason: `Failed to check generation status: ${response.status}`,
          })
        }

        const data = await response.json()
        console.log(`📥 ModelsLab Status: ${data.status}`)

        // Map ModelsLab status to unified format
        if (data.status === "success" && data.output) {
          const images = Array.isArray(data.output) ? data.output : [data.output]
          console.log(`✅ ModelsLab task succeeded, found ${images.length} images`)
          return NextResponse.json({
            status: "TASK_STATUS_SUCCEED",
            images: images,
          })
        } else if (data.status === "processing") {
          const progress = data.eta ? Math.min(90, 100 - (data.eta * 3)) : 50
          console.log(`⏳ ModelsLab task in progress: ${progress}%`)
          return NextResponse.json({
            status: "TASK_STATUS_PROCESSING",
            progress: progress,
            eta: data.eta,
          })
        } else if (data.status === "failed" || data.status === "error") {
          console.log(`❌ ModelsLab task failed: ${data.message || data.messege}`)
          return NextResponse.json({
            status: "TASK_STATUS_FAILED",
            reason: data.message || data.messege || "Generation failed",
          })
        } else {
          console.log(`⏳ ModelsLab task status: ${data.status}`)
          return NextResponse.json({
            status: "TASK_STATUS_PROCESSING",
            progress: 30,
          })
        }
      } catch (error) {
        console.error("❌ ModelsLab Status Check Error:", error)
        return NextResponse.json({
          status: "TASK_STATUS_FAILED",
          reason: error instanceof Error ? error.message : "Status check failed",
        })
      }
    } else {
      // Check Novita status (fallback)
      console.log("📡 Checking Novita status...")
      
      if (!NOVITA_API_KEY) {
        return NextResponse.json({ error: "API key not configured" }, { status: 500 })
      }

      try {
        const response = await fetch(`https://api.novita.ai/v3/async/task-result?task_id=${actualTaskId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${NOVITA_API_KEY}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Novita API error (${response.status}):`, errorText)
          return NextResponse.json(
            {
              error: `Failed to check generation status: ${response.status} ${response.statusText}`,
              details: errorText,
            },
            { status: response.status },
          )
        }

        const data = (await response.json()) as NovitaTaskResultResponse
        console.log(`📥 Novita Task status: ${data.task.status}`)

        // Return appropriate response based on task status
        if (data.task.status === "TASK_STATUS_SUCCEED") {
          console.log(`✅ Novita task succeeded, found ${data.images.length} images`)
          return NextResponse.json({
            status: "TASK_STATUS_SUCCEED",
            images: data.images.map((img) => img.image_url),
          })
        } else if (data.task.status === "TASK_STATUS_FAILED") {
          console.log(`❌ Novita task failed: ${data.task.reason}`)
          return NextResponse.json({
            status: "TASK_STATUS_FAILED",
            reason: data.task.reason || "Unknown error",
          })
        } else {
          console.log(`⏳ Novita task in progress: ${data.task.status}, progress: ${data.task.progress_percent}%`)
          return NextResponse.json({
            status: data.task.status,
            progress: data.task.progress_percent,
            eta: data.task.eta,
          })
        }
      } catch (error) {
        console.error("❌ Novita Status Check Error:", error)
        return NextResponse.json(
          {
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 },
        )
      }
    }
  } catch (error) {
    console.error("❌ Error checking generation status:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}