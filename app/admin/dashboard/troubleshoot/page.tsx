"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Database, 
  Shield, 
  RefreshCw,
  Copy,
  ExternalLink,
  Image,
  Users,
  Search,
  Filter
} from "lucide-react"
import { useCharacters } from "@/components/character-context"

export default function TroubleshootPage() {
  const { initDb, storageBucketExists } = useCharacters()
  const [isFixing, setIsFixing] = useState(false)
  const [fixStatus, setFixStatus] = useState<"idle" | "success" | "error">("idle")
  const [fixMessage, setFixMessage] = useState("")
  const [copiedSQL, setCopiedSQL] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")

  const commonIssues = [
    {
      id: "premium-profiles-constraint",
      title: "Premium Profiles Missing Constraint",
      description: "Error 'no unique or exclusion constraint matching the ON CONFLICT specification' when creating premium profile",
      severity: "high",
      solution: "Add missing unique constraint to premium_profiles table",
      sql: `ALTER TABLE premium_profiles ADD CONSTRAINT premium_profiles_user_id_key UNIQUE (user_id);`,
      icon: Shield
    },
    {
      id: "models-not-showing-monetization",
      title: "Models Not Showing in Monetization Tab",
      description: "Premium page shows 'No models available at the moment' but analytics shows '0 of 1 available'",
      severity: "high",
      solution: "Add missing character_id column to models table and update RLS policies for characters table",
      sql: `-- Fix for Models Not Showing in Monetization
-- Step 1: Check if character_id column exists in models table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'models' AND column_name = 'character_id';

-- If no rows returned, run the migration to add the column:
DO $$
BEGIN
    -- Add character_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'models' AND column_name = 'character_id') THEN
        ALTER TABLE models ADD COLUMN character_id UUID REFERENCES characters(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added character_id column to models table';
    ELSE
        RAISE NOTICE 'character_id column already exists';
    END IF;
END $$;

-- Step 2: Add RLS policy to allow access to characters linked to active models
CREATE POLICY "Allow access to characters linked to active models" ON characters
FOR SELECT USING (
  id IN (
    SELECT character_id FROM models WHERE is_active = true
  )
);
`,
      icon: Shield
    },
    {
      id: "referral-code-not-visible",
      title: "Referral Code Not Showing on Affiliate Page",
      description: "Users have referral codes in database but /affiliate page shows null or blank",
      severity: "high",
      solution: "Fix RLS policies on user_profiles and bonus_wallets tables to allow proper read access",
      sql: `-- Fix RLS Policies for Affiliate System
-- Step 1: Fix user_profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation on signup" ON user_profiles;
DROP POLICY IF EXISTS "Allow public referral code lookup" ON user_profiles;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow all reads (referral codes are meant to be shared publicly)
CREATE POLICY "Allow public referral code lookup"
ON user_profiles FOR SELECT
USING (true);

-- Allow profile creation during signup
CREATE POLICY "Allow profile creation on signup"
ON user_profiles FOR INSERT
WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Allow admins to do everything
CREATE POLICY "Admins can manage all profiles"
ON user_profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- Step 2: Fix bonus_wallets policies
DROP POLICY IF EXISTS "Users can view their own bonus wallet" ON bonus_wallets;
DROP POLICY IF EXISTS "Users can update their own wallet address" ON bonus_wallets;
DROP POLICY IF EXISTS "Admins can view all bonus wallets" ON bonus_wallets;

ALTER TABLE bonus_wallets ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own wallet
CREATE POLICY "Users can view their own bonus wallet"
ON bonus_wallets FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own wallet (for auto-creation)
CREATE POLICY "Users can create their own wallet"
ON bonus_wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their wallet
CREATE POLICY "Users can update their own wallet"
ON bonus_wallets FOR UPDATE
USING (auth.uid() = user_id);

-- Allow admins full access
CREATE POLICY "Admins can manage all wallets"
ON bonus_wallets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);`,
      icon: Users
    },
    {
      id: "rls-character-creation",
      title: "Cannot Create Characters",
      description: "Getting 'row-level security policy violation' error when creating characters",
      severity: "high",
      solution: "Disable RLS temporarily to allow character creation",
      sql: "ALTER TABLE characters DISABLE ROW LEVEL SECURITY;",
      icon: Shield
    },
    {
      id: "database-not-initialized",
      title: "Database Not Initialized",
      description: "Characters table doesn't exist or database setup is incomplete",
      severity: "high",
      solution: "Initialize the database with proper tables and policies",
      sql: "-- Run the database initialization from Admin > Database",
      icon: Database
    },
    {
      id: "character-save-failed",
      title: "Failed to Save Character",
      description: "Error: Failed to save character - Missing user_id column in characters table",
      severity: "high",
      solution: "Add missing columns to characters table for user-created characters",
      sql: `-- Add missing columns to characters table
-- Step 1: Add user_id column if it doesn't exist
ALTER TABLE characters ADD COLUMN IF NOT EXISTS user_id UUID;

-- Step 2: Add other missing columns
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS background TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS greeting TEXT;

-- Step 3: Add indexes
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_is_public ON characters(is_public);

-- Step 4: Update RLS policies
DROP POLICY IF EXISTS "Allow authenticated users full access" ON characters;
CREATE POLICY "Users can insert their own characters" ON characters
    FOR INSERT WITH CHECK (auth.uid() = user_id);`,
      icon: Users
    },
    {
      id: "gallery-images-failed",
      title: "Failed to Load Character Gallery Images",
      description: "Error: Could not find the 'character_id' column of 'generated_images' in the schema cache",
      severity: "high",
      solution: "Add character_id column to generated_images table for gallery functionality",
      sql: `-- Add character_id column to generated_images table
-- Step 1: Make user_id nullable and add character_id column
ALTER TABLE generated_images 
ALTER COLUMN user_id DROP NOT NULL,
ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_generated_images_character_id ON generated_images(character_id);

-- Step 3: Update RLS policies
DROP POLICY IF EXISTS "Users can only see their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only insert their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only update their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can only delete their own images" ON generated_images;
DROP POLICY IF EXISTS "Anonymous users can view public images" ON generated_images;

-- Create new policies that work with character_id
CREATE POLICY "Users can see their own images or images linked to their characters"
ON generated_images FOR SELECT
USING (
  auth.uid() = user_id OR 
  user_id IS NULL OR
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert images for their characters"
ON generated_images FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR 
  user_id IS NULL OR
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own images or images linked to their characters"
ON generated_images FOR UPDATE
USING (
  auth.uid() = user_id OR 
  user_id IS NULL OR
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own images or images linked to their characters"
ON generated_images FOR DELETE
USING (
  auth.uid() = user_id OR 
  user_id IS NULL OR
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);`,
      icon: Image
    },
    {
      id: "storage-bucket-missing",
      title: "Storage Bucket Missing",
      description: "Image uploads fail because storage bucket doesn't exist",
      severity: "medium",
      solution: "Create the required storage bucket for images",
      sql: "-- Check Admin > Database for storage setup",
      icon: Database
    },
    {
      id: "duplicate-payment-processing",
      title: "Duplicate Payment Processing",
      description: "Users getting double tokens and commissions due to duplicate payment processing",
      severity: "high",
      solution: "Clean up duplicate stripe_session_id records and add unique constraint to prevent future duplicates",
      sql: `-- Clean up duplicate stripe_session_id records before adding unique constraint
-- This migration removes duplicate payment transactions, keeping only the most recent one per stripe_session_id

-- Step 1: Identify and delete duplicate records, keeping only the most recent one per stripe_session_id
DELETE FROM payment_transactions
WHERE id NOT IN (
    SELECT DISTINCT ON (stripe_session_id) id
    FROM payment_transactions
    WHERE stripe_session_id IS NOT NULL
    ORDER BY stripe_session_id, created_at DESC
);

-- Step 2: Add unique constraint now that duplicates are cleaned up
ALTER TABLE payment_transactions
ADD CONSTRAINT payment_transactions_stripe_session_id_unique
UNIQUE (stripe_session_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT payment_transactions_stripe_session_id_unique ON payment_transactions
IS 'Ensures only one payment transaction per Stripe session to prevent duplicate processing';

-- Step 3: Verify the constraint was added successfully
DO $$
BEGIN
    RAISE NOTICE 'Unique constraint added successfully to payment_transactions.stripe_session_id';
END $$;`,
      icon: RefreshCw
    }
  ]

  const handleQuickFix = async (issueId: string) => {
    setIsFixing(true)
    setFixStatus("idle")
    setFixMessage("")

    try {
      if (issueId === "rls-character-creation") {
        const response = await fetch("/api/admin/troubleshoot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "disable_rls" }),
        })

        const result = await response.json()

        if (response.ok) {
          setFixMessage(result.message)
          setFixStatus("success")
        } else {
          setFixMessage(`Error: ${result.error}`)
          setFixStatus("error")
        }
      } else if (issueId === "fix-policies") {
        const response = await fetch("/api/admin/troubleshoot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "fix_policies" }),
        })

        const result = await response.json()

        if (response.ok) {
          setFixMessage(result.message)
          setFixStatus("success")
        } else {
          setFixMessage(`Error: ${result.error}`)
          setFixStatus("error")
        }
      } else if (issueId === "enable-rls") {
        const response = await fetch("/api/admin/troubleshoot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "enable_rls" }),
        })

        const result = await response.json()

        if (response.ok) {
          setFixMessage(result.message)
          setFixStatus("success")
        } else {
          setFixMessage(`Error: ${result.error}`)
          setFixStatus("error")
        }
      } else if (issueId === "database-not-initialized") {
        const success = await initDb()
        if (success) {
          setFixMessage("Database has been initialized successfully!")
          setFixStatus("success")
        } else {
          setFixMessage("Failed to initialize database. Please check the manual setup.")
          setFixStatus("error")
        }
      }
    } catch (error) {
      setFixMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setFixStatus("error")
    } finally {
      setIsFixing(false)
    }
  }

  const copySQLToClipboard = (sql: string) => {
    navigator.clipboard.writeText(sql)
    setCopiedSQL(true)
    setTimeout(() => setCopiedSQL(false), 2000)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const filteredIssues = commonIssues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          issue.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSeverity = severityFilter === "all" || issue.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Troubleshoot</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Quick fixes for common admin issues
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by severity" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="high">High Severity</SelectItem>
              <SelectItem value="medium">Medium Severity</SelectItem>
              <SelectItem value="low">Low Severity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Alert */}
      {fixStatus !== "idle" && (
        <Alert className={fixStatus === "success" ? "border-green-500" : "border-red-500"}>
          {fixStatus === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription className={fixStatus === "success" ? "text-green-700" : "text-red-700"}>
            {fixMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Fixes */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No issues found matching your criteria.
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {filteredIssues.map((issue) => (
              <AccordionItem key={issue.id} value={issue.id} className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-start text-left gap-4 w-full pr-4">
                    <issue.icon className="h-5 w-5 text-slate-600 dark:text-slate-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg">{issue.title}</span>
                        <Badge variant={getSeverityColor(issue.severity)} className="text-xs">
                          {issue.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {issue.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4 space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">
                        Solution:
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copySQLToClipboard(issue.sql)}
                        className="h-6 px-2"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {copiedSQL ? "Copied!" : "Copy SQL"}
                      </Button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {issue.solution}
                    </p>
                    <div className="bg-slate-900 text-slate-100 rounded p-3 font-mono text-xs overflow-x-auto max-h-64">
                      <code>{issue.sql}</code>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleQuickFix(issue.id)}
                      disabled={isFixing}
                      className="flex items-center gap-2"
                    >
                      {isFixing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      {isFixing ? "Fixing..." : "Quick Fix"}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => copySQLToClipboard(issue.sql)}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy SQL
                    </Button>

                    {issue.id === "rls-character-creation" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleQuickFix("fix-policies")}
                          disabled={isFixing}
                          className="flex items-center gap-2"
                        >
                          <Shield className="h-4 w-4" />
                          Fix Policies
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleQuickFix("enable-rls")}
                          disabled={isFixing}
                          className="flex items-center gap-2"
                        >
                          <Shield className="h-4 w-4" />
                          Re-enable RLS
                        </Button>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {/* Manual SQL Execution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Manual SQL Execution
          </CardTitle>
          <CardDescription>
            Execute SQL commands directly in your Supabase dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Always backup your database before running SQL commands. 
              These commands will modify your database structure and policies.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">Step 1: Open Supabase Dashboard</h4>
              <Button
                variant="outline"
                onClick={() => window.open("https://supabase.com/dashboard", "_blank")}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Supabase Dashboard
              </Button>
            </div>

            <div>
              <h4 className="font-medium mb-2">Step 2: Navigate to SQL Editor</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Go to your project → SQL Editor in the left sidebar
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Step 3: Copy and Execute SQL</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Copy the SQL command from any issue above and paste it into the SQL editor, then click "Run"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Schema Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Schema Issues
          </CardTitle>
          <CardDescription>
            Common production vs development schema mismatches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Schema Mismatch:</strong> These errors occur when your production database schema 
              doesn't match what the application code expects. This typically happens when migrations 
              haven't been applied to production.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-blue-700 dark:text-blue-300">Character Save Failed</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                The characters table is missing the <code>user_id</code> column and other required fields 
                for user-created characters. This happens when the original schema doesn't include user-specific columns.
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-green-700 dark:text-green-300">Gallery Images Failed</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                The generated_images table is missing the <code>character_id</code> column needed to 
                link images to specific characters for the gallery functionality.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h4 className="font-medium mb-2">Prevention Tips:</h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>• Always run database migrations in production after testing in development</li>
              <li>• Use the migration scripts provided in the project root directory</li>
              <li>• Test schema changes in a staging environment first</li>
              <li>• Keep track of which migrations have been applied to production</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Additional Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
          <CardDescription>
            Helpful links and documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => window.open("https://supabase.com/docs/guides/auth/row-level-security", "_blank")}
              className="flex items-center gap-2 justify-start"
            >
              <ExternalLink className="h-4 w-4" />
              Supabase RLS Documentation
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("https://supabase.com/docs/guides/database/tables", "_blank")}
              className="flex items-center gap-2 justify-start"
            >
              <ExternalLink className="h-4 w-4" />
              Supabase Tables Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
