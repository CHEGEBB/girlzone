import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

export const createServiceRoleClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Missing Supabase URL or Service Role Key")
  }

  return createSupabaseClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  })
}

const createClient = () => {
  return createServerComponentClient<Database>({
    cookies
  })
}

const createClientWithCookies = (cookieStore: any) => {
  return createServerComponentClient<Database>({
    cookies: () => cookieStore
  })
}

// Add the missing named export that's being referenced elsewhere
export { createServerComponentClient as createServerClient }
export { createClient, createClientWithCookies }
