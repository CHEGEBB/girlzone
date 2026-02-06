import { createClient } from "@/lib/supabase/client"
import { getAdminClient } from "@/lib/supabase-admin"
import { v4 as uuidv4 } from "uuid"
import { getAnonymousUserId } from "@/lib/anonymous-user"

// Types for our storage items
export interface StoredImage {
  id: string
  user_id: string
  prompt: string
  image_url: string
  model_used: string
  created_at: string
  tags?: string[]
  favorite?: boolean
  collection_id?: string
  cloudinary_public_id?: string
  cloudinary_folder?: string
}

export interface Collection {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  image_count?: number
}

// Get user ID (authenticated or anonymous)
export const getUserId = async () => {
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user?.id) {
      console.log("User is authenticated with ID:", session.user.id)
      return session.user.id
    }

    // Use the anonymous ID from localStorage
    const anonymousId = getAnonymousUserId()
    console.log("Using anonymous ID from localStorage:", anonymousId)
    return anonymousId
  } catch (error) {
    console.error("Error getting user ID:", error)
    // Fallback to localStorage anonymous ID
    return getAnonymousUserId()
  }
}

// Save image with Cloudinary integration and collection support
export const saveImageWithCollection = async ({
  imageUrl,
  prompt,
  modelUsed = "unknown",
  collectionId,
  tags = [],
  cloudinaryPublicId,
  cloudinaryFolder = "collections",
}: {
  imageUrl: string
  prompt: string
  modelUsed?: string
  collectionId?: string
  tags?: string[]
  cloudinaryPublicId?: string
  cloudinaryFolder?: string
}) => {
  try {
    const supabaseAdmin = await getAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to create admin client")
    }

    const userId = await getUserId()

    const { data, error } = await supabaseAdmin
      .from("generated_images")
      .insert({
        id: uuidv4(),
        user_id: userId,
        prompt,
        image_url: imageUrl,
        model_used: modelUsed,
        collection_id: collectionId || null,
        tags,
        cloudinary_public_id: cloudinaryPublicId || null,
        cloudinary_folder: cloudinaryFolder,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error saving image with collection:", error)
    throw error
  }
}

// Upload image to Cloudinary and save to database with collection support
export const uploadImageToCloudinaryAndSave = async ({
  imageFile,
  prompt,
  modelUsed = "unknown",
  collectionId,
  tags = [],
  folder = "collections",
}: {
  imageFile: File | string // File object or base64 string
  prompt: string
  modelUsed?: string
  collectionId?: string
  tags?: string[]
  folder?: string
}) => {
  try {
    // Convert file to base64 if it's a File object
    let base64Data: string
    if (typeof imageFile === "string") {
      base64Data = imageFile
    } else {
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })
    }

    // Upload to Cloudinary
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo"
    const uploadPreset = "ai-characters-preset"

    const formData = new FormData()
    formData.append("file", base64Data)
    formData.append("upload_preset", uploadPreset)
    formData.append("folder", folder)

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    )

    if (!cloudinaryResponse.ok) {
      const errorData = await cloudinaryResponse.json()
      throw new Error(`Cloudinary upload failed: ${errorData.error?.message || "Unknown error"}`)
    }

    const cloudinaryData = await cloudinaryResponse.json()

    // Save to database with Cloudinary metadata
    const savedImage = await saveImageWithCollection({
      imageUrl: cloudinaryData.secure_url,
      prompt,
      modelUsed,
      collectionId,
      tags,
      cloudinaryPublicId: cloudinaryData.public_id,
      cloudinaryFolder: folder,
    })

    return {
      ...savedImage,
      cloudinaryData,
    }
  } catch (error) {
    console.error("Error uploading image to Cloudinary and saving:", error)
    throw error
  }
}

// Move image between collections
export const moveImageToCollection = async (imageId: string, collectionId: string | null) => {
  try {
    const supabaseAdmin = await getAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to create admin client")
    }

    const userId = await getUserId()

    const { data, error } = await supabaseAdmin
      .from("generated_images")
      .update({ collection_id: collectionId })
      .eq("id", imageId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error moving image to collection:", error)
    throw error
  }
}

// Get images by collection
export const getImagesByCollection = async (collectionId: string) => {
  try {
    const supabaseAdmin = await getAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to create admin client")
    }

    const userId = await getUserId()

    const { data, error } = await supabaseAdmin
      .from("generated_images")
      .select("*")
      .eq("collection_id", collectionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching images by collection:", error)
    throw error
  }
}

// Delete image from Cloudinary and database
export const deleteImageFromCloudinaryAndDatabase = async (imageId: string) => {
  try {
    const supabaseAdmin = await getAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to create admin client")
    }

    const userId = await getUserId()

    // First get the image data to extract Cloudinary public_id
    const { data: image, error: fetchError } = await supabaseAdmin
      .from("generated_images")
      .select("cloudinary_public_id")
      .eq("id", imageId)
      .eq("user_id", userId)
      .single()

    if (fetchError) throw fetchError

    // Delete from Cloudinary if public_id exists
    if (image?.cloudinary_public_id) {
      try {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo"
        const apiKey = process.env.CLOUDINARY_API_KEY
        const apiSecret = process.env.CLOUDINARY_API_SECRET

        if (apiKey && apiSecret) {
          const deleteResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                public_id: image.cloudinary_public_id,
                api_key: apiKey,
                api_secret: apiSecret,
                timestamp: Math.floor(Date.now() / 1000),
              }),
            }
          )

          if (!deleteResponse.ok) {
            console.warn("Failed to delete from Cloudinary:", await deleteResponse.text())
          }
        }
      } catch (cloudinaryError) {
        console.warn("Error deleting from Cloudinary:", cloudinaryError)
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    const { error } = await supabaseAdmin
      .from("generated_images")
      .delete()
      .eq("id", imageId)
      .eq("user_id", userId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("Error deleting image from Cloudinary and database:", error)
    throw error
  }
}

// Existing functions (keeping them for backward compatibility)
export const saveImage = async (imageUrl: string, prompt: string) => {
  return saveImageWithCollection({ imageUrl, prompt })
}

export const getAllImages = async (options?: {
  limit?: number
  offset?: number
  tags?: string[]
  collection_id?: string
  favorite?: boolean
  search?: string
}) => {
  try {
    const supabaseAdmin = await getAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to create admin client")
    }

    const userId = await getUserId()

    let query = supabaseAdmin
      .from("generated_images")
      .select("*")
      .eq("user_id", userId)

    if (options?.collection_id) {
      query = query.eq("collection_id", options.collection_id)
    }

    if (options?.favorite !== undefined) {
      query = query.eq("favorite", options.favorite)
    }

    if (options?.tags && options.tags.length > 0) {
      query = query.overlaps("tags", options.tags)
    }

    if (options?.search) {
      query = query.ilike("prompt", `%${options.search}%`)
    }

    query = query.order("created_at", { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching images:", error)
    throw error
  }
}

export const deleteImage = async (id: string) => {
  return deleteImageFromCloudinaryAndDatabase(id)
}

// Collection CRUD operations
export const createCollection = async ({
  name,
  description,
}: {
  name: string
  description?: string
}) => {
  try {
    const supabaseAdmin = await getAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to create admin client")
    }

    const userId = await getUserId()

    const { data, error } = await supabaseAdmin
      .from("collections")
      .insert({
        id: uuidv4(),
        user_id: userId,
        name,
        description,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error creating collection:", error)
    throw error
  }
}

export const getCollections = async () => {
  try {
    const supabaseAdmin = await getAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to create admin client")
    }

    const userId = await getUserId()

    // Get collections with image count
    const { data, error } = await supabaseAdmin
      .from("collections")
      .select(`
        *,
        image_count:generated_images(count)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Format the response
    return (data || []).map((collection) => ({
      ...collection,
      image_count: collection.image_count?.[0]?.count || 0,
    }))
  } catch (error) {
    console.error("Error fetching collections:", error)
    throw error
  }
}

export const getCollectionById = async (id: string) => {
  try {
    const supabaseAdmin = await getAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to create admin client")
    }

    const userId = await getUserId()

    const { data, error } = await supabaseAdmin
      .from("collections")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error fetching collection:", error)
    throw error
  }
}

export const updateCollection = async (id: string, updates: { name?: string; description?: string }) => {
  try {
    const supabaseAdmin = await getAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to create admin client")
    }

    const userId = await getUserId()

    const { data, error } = await supabaseAdmin
      .from("collections")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error updating collection:", error)
    throw error
  }
}

export const deleteCollection = async (id: string) => {
  try {
    const supabaseAdmin = await getAdminClient()
    if (!supabaseAdmin) {
      throw new Error("Failed to create admin client")
    }

    const userId = await getUserId()

    // First, remove collection_id from all images in this collection
    const { error: updateImagesError } = await supabaseAdmin
      .from("generated_images")
      .update({ collection_id: null })
      .eq("collection_id", id)
      .eq("user_id", userId)

    if (updateImagesError) throw updateImagesError

    // Then delete the collection
    const { error } = await supabaseAdmin
      .from("collections")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("Error deleting collection:", error)
    throw error
  }
}
