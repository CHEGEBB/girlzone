import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

// Helper function to check if a user is an admin
async function isUserAdmin(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", userId)
      .single()

    if (error) {
      console.error("Error checking admin status:", error)
      return false
    }

    return !!data
  } catch (error) {
    console.error("Error in isUserAdmin:", error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(supabase, session.user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    // Get the request body
    const { action } = await request.json()

    if (action === "disable_rls") {
      // Execute SQL to disable RLS on characters table
      const { error } = await supabase.rpc("exec_sql", {
        sql: "ALTER TABLE characters DISABLE ROW LEVEL SECURITY;"
      })

      if (error) {
        console.error("Error disabling RLS:", error)
        return NextResponse.json(
          { error: "Failed to disable RLS", details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "RLS has been temporarily disabled for the characters table"
      })
    }

    if (action === "enable_rls") {
      // Execute SQL to enable RLS on characters table
      const { error } = await supabase.rpc("exec_sql", {
        sql: "ALTER TABLE characters ENABLE ROW LEVEL SECURITY;"
      })

      if (error) {
        console.error("Error enabling RLS:", error)
        return NextResponse.json(
          { error: "Failed to enable RLS", details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "RLS has been re-enabled for the characters table"
      })
    }

    if (action === "fix_policies") {
      // Execute SQL to fix RLS policies
      const fixPoliciesSQL = `
        -- Drop ALL existing policies first to avoid conflicts
        DROP POLICY IF EXISTS "Allow public read access" ON characters;
        DROP POLICY IF EXISTS "Allow authenticated users full access" ON characters;
        DROP POLICY IF EXISTS "Allow authenticated users to insert characters" ON characters;
        DROP POLICY IF EXISTS "Allow authenticated users to update characters" ON characters;
        DROP POLICY IF EXISTS "Allow authenticated users to delete characters" ON characters;

        -- Now create the new policies
        CREATE POLICY "Allow public read access" 
        ON characters FOR SELECT 
        USING (true);

        CREATE POLICY "Allow authenticated users to insert characters" 
        ON characters FOR INSERT 
        WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY "Allow authenticated users to update characters" 
        ON characters FOR UPDATE 
        USING (auth.role() = 'authenticated');

        CREATE POLICY "Allow authenticated users to delete characters" 
        ON characters FOR DELETE 
        USING (auth.role() = 'authenticated');
      `

      const { error } = await supabase.rpc("exec_sql", {
        sql: fixPoliciesSQL
      })

      if (error) {
        console.error("Error fixing policies:", error)
        return NextResponse.json(
          { error: "Failed to fix policies", details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "RLS policies have been fixed for the characters table"
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in troubleshoot API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
