import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Create a Supabase client with admin privileges
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function GET() {
  try {
    const { data, error } = await adminClient.from("faqs").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching FAQs:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { question, answer } = body

    if (!question || !answer) {
      return NextResponse.json({ error: "Question and answer are required" }, { status: 400 })
    }

    // First, try to disable RLS for this operation
    try {
      await adminClient.rpc("disable_rls")
    } catch (rlsError) {
      console.log("Could not disable RLS, continuing with service role:", rlsError)
    }

    const { data, error } = await adminClient.from("faqs").insert([{ question, answer }]).select()

    if (error) {
      console.error("Error adding FAQ:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
