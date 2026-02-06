import { createClient } from "@/lib/supabase-server"
import HomeClient from "./home-client"

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

export default async function Home() {
  const supabase = createClient()

  // Fetch characters server-side (same as chat page does)
  // Only fetch system/default characters (exclude user-created ones)
  const { data: characters } = await supabase
    .from("characters")
    .select("*")
    .is("user_id", null)
    .order("created_at", { ascending: false })

  // Convert snake_case field names to camelCase
  const formattedCharacters = snakeToCamel(characters || [])

  return <HomeClient initialCharacters={formattedCharacters} />
}
