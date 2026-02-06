import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if user is authenticated and is admin
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, ICO, and SVG files are allowed." },
        { status: 400 }
      )
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 1MB." },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExt = file.name.split(".").pop()
    const fileName = `favicon-${timestamp}.${fileExt}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()

    // Upload to Bunny.net storage
    const storageZoneName = process.env.BUNNY_STORAGE_ZONE
    const accessKey = process.env.BUNNY_API_KEY
    const storageHostname = process.env.BUNNY_HOSTNAME || "storage.bunnycdn.com"
    const cdnUrl = process.env.BUNNY_CDN_URL

    if (!storageZoneName || !accessKey || !cdnUrl) {
      return NextResponse.json(
        { error: "Storage configuration missing" },
        { status: 500 }
      )
    }

    const uploadPath = `favicons/${fileName}`
    const uploadUrl = `https://${storageHostname}/${storageZoneName}/${uploadPath}`

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: accessKey,
        "Content-Type": file.type,
      },
      body: bytes,
    })

    if (!uploadResponse.ok) {
      console.error("Bunny.net upload failed:", await uploadResponse.text())
      return NextResponse.json(
        { error: "Failed to upload favicon" },
        { status: 500 }
      )
    }

    // Construct the CDN URL
    const faviconUrl = `${cdnUrl}/${uploadPath}`

    return NextResponse.json({
      success: true,
      url: faviconUrl,
      message: "Favicon uploaded successfully",
    })
  } catch (error) {
    console.error("Error uploading favicon:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
