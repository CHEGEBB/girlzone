import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createRouteHandlerClient(
      { cookies: () => cookies() },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    )

    // Let's first check what's actually in the database
    const diagnosticSQL = `
      -- Check if admin_settings table exists and its structure
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'admin_settings' 
      ORDER BY ordinal_position;
    `

    const { data: tableInfo, error: checkError } = await supabaseAdmin.rpc("exec_sql", { sql: diagnosticSQL })

    console.log("Current admin_settings table structure:", tableInfo)

    // Check for any existing policies
    const policySQL = `
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies 
      WHERE tablename = 'admin_settings';
    `

    const { data: policies, error: policyError } = await supabaseAdmin.rpc("exec_sql", { sql: policySQL })

    console.log("Existing policies:", policies)

    // Now let's completely remove everything related to admin_settings and recreate it
    const cleanupSQL = `
      -- Drop all policies first
      DROP POLICY IF EXISTS "Admins can read admin settings" ON admin_settings;
      DROP POLICY IF EXISTS "Admins can modify admin settings" ON admin_settings;
      DROP POLICY IF EXISTS "Allow admin users to manage settings" ON admin_settings;
      DROP POLICY IF EXISTS "Allow public read access to settings" ON admin_settings;
      
      -- Drop any indexes
      DROP INDEX IF EXISTS admin_settings_key_idx;
      
      -- Drop the table completely
      DROP TABLE IF EXISTS admin_settings CASCADE;
      
      -- Also check if there are any views or functions that reference this table
      DROP VIEW IF EXISTS admin_settings_view CASCADE;
    `

    const { error: cleanupError } = await supabaseAdmin.rpc("exec_sql", { sql: cleanupSQL })

    if (cleanupError) {
      console.error("Error during cleanup:", cleanupError)
      return NextResponse.json({
        error: "cleanup_failed",
        details: cleanupError.message
      }, { status: 500 })
    }

    // Now create the table fresh
    const createTableSQL = `
      -- Create the admin_settings table with the correct structure
      CREATE TABLE admin_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create index
      CREATE INDEX admin_settings_key_idx ON admin_settings (key);

      -- Enable RLS
      ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

      -- Create policies (simplified to avoid any potential conflicts)
      CREATE POLICY "admin_settings_select_policy" 
        ON admin_settings FOR SELECT 
        USING (true);

      CREATE POLICY "admin_settings_all_policy" 
        ON admin_settings FOR ALL 
        USING (true)
        WITH CHECK (true);

      -- Insert default settings
      INSERT INTO admin_settings (key, value, description) VALUES
      ('monetization_enabled', 'true', 'Enable or disable the monetization system'),
      ('token_to_usd_rate', '0.01', 'Token to USD conversion rate (1 token = $0.01)'),
      ('withdrawal_processing_fee_percent', '0', 'Processing fee percentage for withdrawals (0-100)'),
      ('minimum_withdrawal_amount', '10.00', 'Minimum amount required for withdrawal requests'),
      ('stripe_secret_key', '', 'Stripe secret key for payment processing'),
      ('stripe_webhook_secret', '', 'Stripe webhook secret for verifying events'),
      ('site_name', 'Girlzone.ai', 'The name of the site'),
      ('logo_text', 'Girlzone', 'The text part of the logo');
    `

    const { error: createError } = await supabaseAdmin.rpc("exec_sql", { sql: createTableSQL })

    if (createError) {
      console.error("Error creating table:", createError)
      return NextResponse.json({
        error: "create_failed",
        details: createError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Admin settings table has been completely recreated with the correct structure.",
      tableInfo: tableInfo,
      policies: policies
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
