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

    // Let's first check what's actually in the site_settings table
    const diagnosticSQL = `
      -- Check if site_settings table exists and its structure
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'site_settings' 
      ORDER BY ordinal_position;
    `

    const { data: tableInfo, error: checkError } = await supabaseAdmin.rpc("exec_sql", { sql: diagnosticSQL })

    console.log("Current site_settings table structure:", tableInfo)

    // Check for any existing policies
    const policySQL = `
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies 
      WHERE tablename = 'site_settings';
    `

    const { data: policies, error: policyError } = await supabaseAdmin.rpc("exec_sql", { sql: policySQL })

    console.log("Existing site_settings policies:", policies)

    // Now let's completely remove everything related to site_settings and recreate it
    const cleanupSQL = `
      -- Drop all policies first
      DROP POLICY IF EXISTS "Admins can manage site settings" ON site_settings;
      DROP POLICY IF EXISTS "Public can read public site settings" ON site_settings;
      DROP POLICY IF EXISTS "Allow admin users to manage settings" ON site_settings;
      DROP POLICY IF EXISTS "Allow public read access to settings" ON site_settings;
      DROP POLICY IF EXISTS "site_settings_select_policy" ON site_settings;
      DROP POLICY IF EXISTS "site_settings_all_policy" ON site_settings;
      
      -- Drop any indexes
      DROP INDEX IF EXISTS site_settings_key_idx;
      
      -- Drop the table completely
      DROP TABLE IF EXISTS site_settings CASCADE;
      
      -- Also check if there are any views or functions that reference this table
      DROP VIEW IF EXISTS site_settings_view CASCADE;
      
      -- Drop the trigger function if it exists
      DROP FUNCTION IF EXISTS update_site_settings_updated_at() CASCADE;
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
      -- Create the site_settings table with the correct structure
      CREATE TABLE site_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value JSONB NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create index
      CREATE INDEX site_settings_key_idx ON site_settings (key);

      -- Enable RLS
      ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

      -- Create policies (simplified to avoid any potential conflicts)
      CREATE POLICY "site_settings_select_policy" 
        ON site_settings FOR SELECT 
        USING (true);

      CREATE POLICY "site_settings_all_policy" 
        ON site_settings FOR ALL 
        USING (true)
        WITH CHECK (true);

      -- Function to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger for updated_at
      CREATE TRIGGER update_site_settings_updated_at
          BEFORE UPDATE ON site_settings
          FOR EACH ROW
          EXECUTE FUNCTION update_site_settings_updated_at();

      -- Insert default site settings
      INSERT INTO site_settings (key, value, description) VALUES
      ('site_name', '"Girlzone.ai"', 'The name of the site displayed in browser tabs and throughout the application'),
      ('logo_text', '"Girlzone"', 'The text part of the logo (before the .ai)'),
      ('language', '"en"', 'Default language for the site'),
      ('pricing', '{
        "currency": "$",
        "currencyPosition": "left",
        "monthly": {
          "price": 12.99,
          "originalPrice": 19.99,
          "discount": 35
        },
        "quarterly": {
          "price": 9.99,
          "originalPrice": 19.99,
          "discount": 50
        },
        "yearly": {
          "price": 5.99,
          "originalPrice": 19.99,
          "discount": 70
        }
      }', 'Pricing configuration for premium subscriptions');
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
      message: "Site settings table has been completely recreated with the correct structure.",
      tableInfo: tableInfo,
      policies: policies
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
