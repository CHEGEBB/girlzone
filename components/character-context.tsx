"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import supabase from "@/lib/supabase"
import type { Character, CharacterInsert, CharacterUpdate } from "@/lib/types"
import { checkTableExists, initializeDatabase, checkStorageBucket } from "@/lib/db-init"

type CharacterContextType = {
  characters: Character[]
  isLoading: boolean
  error: string | null
  activeType: string
  setActiveType: (type: string) => void
  addCharacter: (character: Omit<CharacterInsert, "createdAt" | "isNew">) => Promise<Character>
  updateCharacter: (id: string, character: CharacterUpdate) => Promise<Character | null>
  deleteCharacter: (id: string) => Promise<boolean>
  getCharacter: (id: string) => Character | undefined
  uploadImage: (file: File) => Promise<string>
  initDb: () => Promise<boolean>
  storageBucketExists: boolean
  createAdminUsersTable: () => Promise<boolean>
  refreshCharacters: () => Promise<void>
  loadMoreCharacters: () => Promise<void>
  hasMore: boolean
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined)

// Helper function to convert snake_case to camelCase
const snakeToCamel = (obj: any): any => {
  if (obj === null || typeof obj !== "object") {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel)
  }

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    acc[camelKey] = snakeToCamel(obj[key])
    return acc
  }, {} as any)
}

// Helper function to convert camelCase to snake_case
const camelToSnake = (obj: any): any => {
  if (obj === null || typeof obj !== "object") {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(camelToSnake)
  }

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    acc[snakeKey] = camelToSnake(obj[key])
    return acc
  }, {} as any)
}

// Helper function to safely convert errors to strings
const formatError = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    return String(err.message)
  }
  return String(err)
}

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dbInitialized, setDbInitialized] = useState(false)
  const [storageBucketExists, setStorageBucketExists] = useState(false)
  const [activeType, setActiveType] = useState<string>("Female")
  const [hasMore, setHasMore] = useState(true)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)

  // Cache duration in milliseconds (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000

  // Initialize database and fetch characters
  useEffect(() => {
    async function setup() {
      try {
        setIsLoading(true)

        // Run all checks in parallel for better performance
        const [tableExists, bucketExists] = await Promise.all([
          checkTableExists(),
          checkStorageBucket()
        ])

        setDbInitialized(tableExists)
        setStorageBucketExists(bucketExists)

        // Fetch initial batch of characters if database is initialized
        if (tableExists) {
          // Check if we have cached data that's still fresh
          const now = Date.now()
          const isCacheValid = characters.length > 0 && (now - lastFetchTime) < CACHE_DURATION

          if (!isCacheValid) {
            await fetchCharacters(24) // Fetch initial 24 characters for faster loading
            setLastFetchTime(now)
          }
        } else {
          // Use sample data if database initialization failed
          setCharacters(sampleCharacters)
          setError("Database not initialized. Using sample data. Go to Admin > Database to set up the database.")
        }

        // Show storage warning if bucket doesn't exist
        if (!bucketExists && !error) {
          setError(
            'Storage bucket "images" not found. Image uploads will not work. Go to Admin > Database for setup instructions.',
          )
        }
      } catch (err) {
        console.error("Error during setup:", err)
        setError("Setup failed. Using sample data.")
        setCharacters(sampleCharacters)
      } finally {
        setIsLoading(false)
      }
    }

    setup()
  }, [])

  // Fetch characters from Supabase with optional limit for pagination
  async function fetchCharacters(limit?: number, offset: number = 0) {
    try {
      // Only fetch system/default characters (where user_id is NULL)
      // User-created characters should only appear on the my-ai page
      let query = supabase
        .from("characters")
        .select("*")
        .is("user_id", null)
        .order("created_at", { ascending: false })

      // Add limit and offset for pagination
      if (limit) {
        query = query.limit(limit)
      }
      if (offset > 0) {
        query = query.range(offset, offset + (limit || 100) - 1)
      }

      const { data, error: supabaseError } = await query

      if (supabaseError) {
        throw supabaseError
      }

      console.log("Raw Supabase data:", JSON.stringify(data, null, 2))

      // Convert snake_case to camelCase
      const formattedData = snakeToCamel(data || [])
      console.log("Formatted character data:", JSON.stringify(formattedData, null, 2))

      // If we're fetching with an offset, append to existing characters
      if (offset > 0) {
        setCharacters(prev => [...prev, ...formattedData])
      } else {
        setCharacters(formattedData)
      }

      // Update hasMore flag
      setHasMore(formattedData.length === limit)
    } catch (err) {
      console.error("Error fetching characters:", err)
      setError("Failed to load characters")

      // Fallback to sample data only on first fetch
      if (offset === 0) {
        setCharacters(sampleCharacters)
      }
    }
  }

  const initDb = async (): Promise<boolean> => {
    try {
      setIsLoading(true)

      // Initialize the database
      const initialized = await initializeDatabase()
      setDbInitialized(initialized)

      // Check if storage bucket exists
      const bucketExists = await checkStorageBucket()
      setStorageBucketExists(bucketExists)

      if (initialized) {
        await fetchCharacters()

        // Update error message based on storage bucket status
        if (!bucketExists) {
          setError(
            'Database initialized, but storage bucket "images" not found. Image uploads will not work. Please create the bucket manually.',
          )
        } else {
          setError(null)
        }
      }

      return initialized
    } catch (err) {
      console.error("Error initializing database:", err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const addCharacter = async (characterData: Omit<CharacterInsert, "createdAt" | "isNew">): Promise<Character> => {
    try {
      if (!dbInitialized) {
        throw new Error("Database not initialized. Please set up the database first.")
      }

      const newCharacter: CharacterInsert = {
        ...characterData,
        isNew: true,
      }

      // Convert camelCase to snake_case
      const snakeCaseData = camelToSnake(newCharacter)

      const { data, error: supabaseError } = await supabase.from("characters").insert([snakeCaseData]).select().single()

      if (supabaseError) {
        throw supabaseError
      }

      // Convert snake_case back to camelCase
      const formattedData = snakeToCamel(data)
      setCharacters((prev) => [formattedData, ...prev])
      return formattedData
    } catch (err) {
      console.error("Error adding character:", err)
      throw new Error(formatError(err))
    }
  }

  const updateCharacter = async (id: string, characterData: CharacterUpdate): Promise<Character | null> => {
    try {
      if (!dbInitialized) {
        throw new Error("Database not initialized. Please set up the database first.")
      }

      // Convert camelCase to snake_case
      const snakeCaseData = camelToSnake(characterData)

      const { data, error: supabaseError } = await supabase
        .from("characters")
        .update(snakeCaseData)
        .eq("id", id)
        .select()
        .single()

      if (supabaseError) {
        throw supabaseError
      }

      // Convert snake_case back to camelCase
      const formattedData = snakeToCamel(data)
      setCharacters((prev) => prev.map((char) => (char.id === id ? formattedData : char)))
      return formattedData
    } catch (err) {
      console.error("Error updating character:", err)
      throw new Error(formatError(err))
    }
  }

  // Upload image to Bunny.net CDN via API route
  const uploadImage = async (file: File): Promise<string> => {
    try {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        throw new Error("Image file is too large. Please choose a smaller image (max 10MB).")
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
      if (!validTypes.includes(file.type)) {
        throw new Error("Unsupported image format. Please use JPG, PNG, WebP, or GIF images.")
      }

      // Convert File to base64 string
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      console.log('[Admin Upload] Uploading image to Bunny.net via API...')

      // Upload via API route to Bunny.net
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64String,
          filename: file.name,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Upload API error: ${errorData.error || "Unknown error"}`)
      }

      const result = await response.json()

      if (!result.url) {
        throw new Error("Failed to upload image to Bunny.net")
      }

      console.log('[Admin Upload] Image uploaded successfully:', result.url)
      return result.url
    } catch (err) {
      console.error("Error uploading image:", err)

      // Provide a more helpful error message
      if (err instanceof Error) {
        if (err.message.includes("network") || err.message.includes("connection")) {
          throw new Error("Network error while uploading image. Please check your internet connection and try again.")
        } else if (err.message.includes("size") || err.message.includes("large")) {
          throw new Error("Image file is too large. Please choose a smaller image (max 10MB).")
        } else if (err.message.includes("format") || err.message.includes("type")) {
          throw new Error("Unsupported image format. Please use JPG, PNG, or WebP images.")
        }
      }

      throw new Error(formatError(err))
    }
  }

  const deleteCharacter = async (id: string): Promise<boolean> => {
    try {
      if (!dbInitialized) {
        throw new Error("Database not initialized. Please set up the database first.")
      }

      // Get the character to access its image URL
      const character = getCharacter(id)

      // Delete the character from the database
      const { error: supabaseError } = await supabase.from("characters").delete().eq("id", id)

      if (supabaseError) {
        // Check if it's an auth error
        if (supabaseError.message.includes("auth") || supabaseError.message.includes("token")) {
          // Try to refresh the session
          await supabase.auth.refreshSession()

          // Try again
          const { error: retryError } = await supabase.from("characters").delete().eq("id", id)
          if (retryError) throw retryError
        } else {
          throw supabaseError
        }
      }

      // If the character had a Cloudinary image, delete it
      if (character && character.image && character.image.includes("cloudinary.com")) {
        try {
          // Import the Cloudinary functions from server actions
          const { getPublicIdFromUrl, deleteImageFromCloudinary } = await import("@/lib/cloudinary-actions")

          // Extract public ID and delete the image
          const publicId = await getPublicIdFromUrl(character.image)
          if (publicId) {
            await deleteImageFromCloudinary(publicId)
            console.log("Deleted character image:", publicId)
          }
        } catch (deleteErr) {
          console.warn("Failed to delete character image from Cloudinary:", deleteErr)
          // Continue with character deletion even if image deletion fails
        }
      }

      setCharacters((prev) => prev.filter((char) => char.id !== id))
      return true
    } catch (err) {
      console.error("Error deleting character:", err)

      // If it's an auth error, suggest logging in again
      if (
        err instanceof Error &&
        (err.message.includes("Authentication") || err.message.includes("auth") || err.message.includes("token"))
      ) {
        throw new Error("Authentication session expired. Please log out and log in again.")
      }

      throw new Error(formatError(err))
    }
  }

  const getCharacter = (id: string): Character | undefined => {
    return characters.find((char) => char.id === id)
  }

  const createAdminUsersTable = async (): Promise<boolean> => {
    try {
      // First check if the table exists by trying to query it
      const { error: checkError } = await supabase.from("admin_users").select("id").limit(1)

      // If there's no error, the table exists
      if (!checkError) {
        return true
      }

      // If we get here, the table doesn't exist or there's a permission issue
      // Let's try to create it using raw SQL
      const createTableSQL = `
        -- Create admin_users table if it doesn't exist
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create unique index on user_id
        CREATE UNIQUE INDEX IF NOT EXISTS admin_users_user_id_idx ON admin_users(user_id);
        
        -- Enable RLS
        ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for admins to read
        DROP POLICY IF EXISTS "Allow admins to read admin_users" ON admin_users;
        CREATE POLICY "Allow admins to read admin_users"
          ON admin_users FOR SELECT
          USING (auth.uid() IN (SELECT user_id FROM admin_users));
        
        -- Create policy for authenticated users to insert
        DROP POLICY IF EXISTS "Allow authenticated users to insert into admin_users" ON admin_users;
        CREATE POLICY "Allow authenticated users to insert into admin_users"
          ON admin_users FOR INSERT
          WITH CHECK (auth.role() = 'authenticated');
          
        -- Create a view for listing users with admin status
        CREATE OR REPLACE VIEW users_view AS
        SELECT 
          au.id,
          au.email,
          au.created_at,
          au.user_metadata->>'username' as username,
          (admin.id IS NOT NULL) as is_admin
        FROM 
          auth.users au
        LEFT JOIN 
          admin_users admin ON au.id = admin.user_id;
      `

      // Try to execute the SQL directly
      const { error: sqlError } = await supabase.rpc("exec_sql", { sql: createTableSQL })

      if (sqlError) {
        console.error("Error creating admin_users table:", sqlError)
        return false
      }

      return true
    } catch (error) {
      console.error("Error creating admin_users table:", error)
      return false
    }
  }

  const refreshCharacters = async (): Promise<void> => {
    const now = Date.now()
    await fetchCharacters() // Fetch all without limit on refresh
    setLastFetchTime(now)
  }

  const loadMoreCharacters = async (): Promise<void> => {
    if (!hasMore || isLoading) return

    setIsLoading(true)
    try {
      await fetchCharacters(24, characters.length)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CharacterContext.Provider
      value={{
        characters,
        isLoading,
        error,
        activeType,
        setActiveType,
        addCharacter,
        updateCharacter,
        deleteCharacter,
        getCharacter,
        uploadImage,
        initDb,
        storageBucketExists,
        createAdminUsersTable,
        refreshCharacters,
        loadMoreCharacters,
        hasMore,
      }}
    >
      {children}
    </CharacterContext.Provider>
  )
}

export function useCharacters() {
  const context = useContext(CharacterContext)
  if (context === undefined) {
    throw new Error("useCharacters must be used within a CharacterProvider")
  }
  return context
}

// Sample character data for fallback
const sampleCharacters: Character[] = [
  {
    id: "1",
    name: "Rebecca",
    age: 28,
    image: "/placeholder.svg?height=400&width=300",
    description: "Yoga instructor and wellness coach who loves helping others achieve balance in their lives.",
    personality: "Energetic and joyful",
    occupation: "Yoga & Fitness Coach",
    hobbies: "Yoga, Fitness, Nature",
    body: "Athletic",
    ethnicity: "American",
    language: "English",
    relationship: "Single",
    isNew: true,
    createdAt: new Date().toISOString(),
    systemPrompt:
      "You are Rebecca, a 28-year-old yoga instructor and wellness coach. You are energetic, joyful, and passionate about helping others achieve balance in their lives. You speak in a calm, encouraging tone and often suggest wellness tips.",
  },
  // Other sample characters...
]
