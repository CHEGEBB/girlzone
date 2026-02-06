"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Clock, Play, AlertTriangle, CheckCircle2, Copy } from "lucide-react"
import { toast } from "sonner"

export default function CronJobsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  const triggerCronJob = async () => {
    // Note: This is a client-side trigger for testing.
    // In production, this should be triggered by a real cron service.
    // We need the cron secret, but we can't expose it to the client securely.
    // For this admin tool, we'll create a server action wrapper or API route that checks admin auth
    // and then calls the cron logic or endpoint.
    // However, since we can't easily modify the cron endpoint to accept admin auth without changing its contract,
    // we will just explain how to trigger it.
    
    toast.info("To trigger manually, you need to make a POST request with the CRON_SECRET")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cron Jobs & Automation</h1>
        <p className="text-muted-foreground">
          Manage and monitor automated background tasks
        </p>
      </div>

      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>How Cron Jobs Work</AlertTitle>
        <AlertDescription>
          These automated tasks are triggered by an external scheduler (like Vercel Cron or GitHub Actions) calling specific API endpoints. They are not self-executing.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  Monthly Subscription Tokens
                  <Badge variant="outline">Monthly</Badge>
                </CardTitle>
                <CardDescription>
                  Grants bonus tokens to active subscribers based on their plan settings
                </CardDescription>
              </div>
              <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Endpoint URL</h3>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md font-mono text-sm">
                  <span className="truncate flex-1">/api/cron/grant-subscription-tokens</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard("/api/cron/grant-subscription-tokens")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Schedule</h3>
                <div className="p-2 bg-muted rounded-md text-sm">
                  1st of every month at 00:00 UTC
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Requires <code className="bg-muted px-1 rounded">Authorization: Bearer CRON_SECRET</code> header.
              </p>
            </div>

            <div className="rounded-md border p-4 bg-muted/50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Important Note</p>
                  <p className="text-sm text-muted-foreground">
                    This job processes all active subscriptions. Ensure your <code className="text-xs bg-background px-1 rounded border">CRON_SECRET</code> environment variable is set in your deployment settings.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/20 border-t flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Last run: Check server logs</p>
            {/* 
            <Button size="sm" onClick={triggerCronJob} variant="outline" className="gap-2">
              <Play className="h-3 w-3" />
              Test Trigger (Admin)
            </Button> 
            */}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  Fix Affiliate Commissions
                  <Badge variant="outline">Every 10 min</Badge>
                </CardTitle>
                <CardDescription>
                  Scans recent payments and credits missing commissions (Backup for realtime tracking)
                </CardDescription>
              </div>
              <Badge className="bg-blue-500 hover:bg-blue-600">New</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Endpoint URL</h3>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md font-mono text-sm">
                  <span className="truncate flex-1">/api/cron/fix-commissions</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard("/api/cron/fix-commissions")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Recommended Schedule</h3>
                <div className="p-2 bg-muted rounded-md text-sm">
                  Every 10 minutes (*/10 * * * *)
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Requires <code className="bg-muted px-1 rounded">Authorization: Bearer CRON_SECRET</code> header.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>How to configure these jobs in your hosting provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                Option 1: Vercel Cron (Recommended)
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Add this to your <code className="text-xs bg-muted px-1 rounded">vercel.json</code> file:
              </p>
              <pre className="p-4 rounded-lg bg-black text-white text-xs overflow-x-auto">
{`{
  "crons": [
    {
      "path": "/api/cron/grant-subscription-tokens",
      "schedule": "0 0 1 * *"
    }
  ]
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                Option 2: External Cron Service
              </h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Service: EasyCron, cron-job.org, etc.</li>
                <li>URL: <code className="text-xs bg-muted px-1 rounded">https://your-domain.com/api/cron/grant-subscription-tokens</code></li>
                <li>Method: POST</li>
                <li>Header: <code className="text-xs bg-muted px-1 rounded">Authorization: Bearer YOUR_CRON_SECRET</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
