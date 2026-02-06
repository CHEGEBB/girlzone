import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadImageToBunny(imageUrl: string, filename?: string): Promise<string> {
  try {
    const bunnyStorageZone = process.env.BUNNY_STORAGE_ZONE
    const bunnyApiKey = process.env.BUNNY_API_KEY
    const bunnyHostname = process.env.BUNNY_HOSTNAME || 'storage.bunnycdn.com'
    const bunnyCdnUrl = process.env.BUNNY_CDN_URL

    if (!bunnyStorageZone || !bunnyApiKey || !bunnyCdnUrl) {
      throw new Error('Bunny.net configuration missing in environment variables')
    }

    let imageBuffer: Buffer
    let contentType = 'image/jpeg'
    let extension = 'jpg'

    // Check if imageUrl is base64 or URL
    if (imageUrl.startsWith('data:')) {
      // Handle base64 data
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches) {
        throw new Error('Invalid base64 data URL format')
      }
      contentType = matches[1]
      const base64Data = matches[2]
      imageBuffer = Buffer.from(base64Data, 'base64')
      extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    } else {
      // Fetch from URL
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
      }
      const arrayBuffer = await imageResponse.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
      contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
      extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    }

    // Generate unique filename
    const imageFilename = filename || `image_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`
    const filePath = `generated-images/${imageFilename}`

    // Upload to Bunny.net Storage
    const uploadUrl = `https://${bunnyHostname}/${bunnyStorageZone}/${filePath}`

    console.log('[Bunny.net] Uploading to:', uploadUrl)
    console.log('[Bunny.net] Storage Zone:', bunnyStorageZone)
    console.log('[Bunny.net] Using API Key:', bunnyApiKey ? `${bunnyApiKey.substring(0, 10)}...` : 'NOT SET')

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': bunnyApiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(imageBuffer),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Bunny.net upload error:', errorText)
      console.error('Response status:', response.status, response.statusText)
      throw new Error(`Failed to upload to Bunny.net: ${response.statusText} - ${errorText}`)
    }

    // Return the CDN URL
    const cdnUrl = `${bunnyCdnUrl}/${filePath}`
    console.log('[Bunny.net] Upload successful:', cdnUrl)
    return cdnUrl
  } catch (error) {
    console.error('Error uploading image to Bunny.net, attempting Cloudinary fallback:', error)

    try {
      // Fallback to Cloudinary
      const cloudinaryUrl = await uploadImageToCloudinary(imageUrl, 'generated-images')
      console.log('[Cloudinary] Fallback upload successful:', cloudinaryUrl)
      return cloudinaryUrl
    } catch (cloudinaryError) {
      console.error('Cloudinary fallback also failed:', cloudinaryError)
      throw new Error('Failed to upload image to both Bunny.net and Cloudinary')
    }
  }
}

// Keep Cloudinary image upload for backward compatibility (deprecated)
export async function uploadImageToCloudinary(imageUrl: string, folder: string = 'chat-images'): Promise<string> {
  try {
    // Upload the image to Cloudinary
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    })

    return result.secure_url
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error)
    throw new Error('Failed to upload image to Cloudinary')
  }
}

export async function uploadVideoToBunny(videoBase64: string, filename?: string): Promise<string> {
  try {
    const bunnyStorageZone = process.env.BUNNY_STORAGE_ZONE
    const bunnyApiKey = process.env.BUNNY_API_KEY
    const bunnyHostname = process.env.BUNNY_HOSTNAME || 'storage.bunnycdn.com'
    const bunnyCdnUrl = process.env.BUNNY_CDN_URL

    if (!bunnyStorageZone || !bunnyApiKey || !bunnyCdnUrl) {
      throw new Error('Bunny.net configuration missing in environment variables')
    }

    // Convert base64 to buffer
    const base64Data = videoBase64.replace(/^data:video\/mp4;base64,/, '')
    const videoBuffer = Buffer.from(base64Data, 'base64')

    // Generate unique filename
    const videoFilename = filename || `video_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`
    const filePath = `generated-videos/${videoFilename}`

    // Upload to Bunny.net Storage
    const uploadUrl = `https://${bunnyHostname}/${bunnyStorageZone}/${filePath}`

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': bunnyApiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(videoBuffer),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Bunny.net upload error:', errorText)
      throw new Error(`Failed to upload to Bunny.net: ${response.statusText}`)
    }

    // Return the CDN URL
    const cdnUrl = `${bunnyCdnUrl}/${filePath}`
    return cdnUrl
  } catch (error) {
    console.error('Error uploading video to Bunny.net, attempting Cloudinary fallback:', error)
    try {
      // Fallback to Cloudinary
      const cloudinaryUrl = await uploadVideoToCloudinary(videoBase64, 'generated-videos')
      console.log('[Cloudinary] Video fallback upload successful:', cloudinaryUrl)
      return cloudinaryUrl
    } catch (cloudinaryError) {
      console.error('Cloudinary video fallback also failed:', cloudinaryError)
      throw new Error('Failed to upload video to both Bunny.net and Cloudinary')
    }
  }
}

// Keep Cloudinary video upload for backward compatibility (deprecated)
export async function uploadVideoToCloudinary(videoBase64: string, folder: string = 'generated-videos'): Promise<string> {
  try {
    // Upload the video to Cloudinary
    const result = await cloudinary.uploader.upload(videoBase64, {
      folder: folder,
      resource_type: 'video',
      transformation: [
        { quality: 'auto' },
      ]
    })

    return result.secure_url
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error)
    throw new Error('Failed to upload video to Cloudinary')
  }
}

export async function deleteImageFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error)
    throw new Error('Failed to delete image from Cloudinary')
  }
}
