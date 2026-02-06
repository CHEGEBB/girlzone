"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useSite } from "@/components/site-context"
import { AlertCircle, CheckCircle2, Save, ToggleLeft, ToggleRight, Shuffle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function FeaturesPage() {
  const { settings, updateSettings } = useSite()
  const [isSaving, setIsSaving] = useState(false)
  const [faceSwapEnabled, setFaceSwapEnabled] = useState(settings.features.faceSwap)

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true)
      
      await updateSettings({
        features: {
          faceSwap: faceSwapEnabled
        }
      })

      toast.success("Features settings saved successfully")
    } catch (error) {
      console.error("Error saving features settings:", error)
      toast.error("Failed to save features settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 dark:from-violet-500/5 dark:via-purple-500/5 dark:to-fuchsia-500/5 rounded-2xl p-8 border border-violet-200/50 dark:border-violet-800/50 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-lg">
              <Shuffle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                Feature Management
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Control the visibility and availability of platform features
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Face Swap Feature Toggle */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-violet-500 rounded-lg">
                <Shuffle className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-violet-900 dark:text-violet-100">Face Swap</CardTitle>
                <CardDescription>Enable or disable the face swap feature for users</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50 rounded-xl border-2 border-violet-200 dark:border-violet-800">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Label className="text-lg font-semibold">Enable Face Swap</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to access the Face Swap tool in the sidebar
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        {faceSwapEnabled ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-slate-500" />
                        )}
                        <span className={faceSwapEnabled ? "text-green-700 dark:text-green-300" : "text-slate-700 dark:text-slate-300"}>
                          {faceSwapEnabled ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setFaceSwapEnabled(!faceSwapEnabled)}
                    className={`flex items-center gap-2 h-12 px-6 ${
                      faceSwapEnabled
                        ? "bg-green-100 border-green-300 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-800"
                        : "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                    }`}
                  >
                    {faceSwapEnabled ? (
                      <>
                        <ToggleRight className="h-5 w-5" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-5 w-5" />
                        Disabled
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Alert className={faceSwapEnabled ? "border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/50" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"}>
                {faceSwapEnabled ? (
                  <CheckCircle2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                )}
                <AlertDescription className={`${faceSwapEnabled ? "text-violet-900 dark:text-violet-100" : "text-slate-900 dark:text-slate-100"}`}>
                  {faceSwapEnabled
                    ? "The Face Swap page is visible in the sidebar and accessible to users."
                    : "The Face Swap page is hidden from the sidebar."}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t">
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-md hover:shadow-lg transition-all"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
