"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Upload } from "lucide-react"
import Image from "next/image"

interface UserProfileInfoProps {
  userId: string
}

export function UserProfileInfo({ userId }: UserProfileInfoProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState(user?.username || "")
  const [isLoading, setIsLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "")
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // This would be implemented in a real app
      // const response = await fetch("/api/update-profile", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ username }),
      // })

      // if (!response.ok) throw new Error("Failed to update profile")

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      })

      setIsEditing(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    setIsUploadingAvatar(true)

    try {
      // Convert image to base64
      const base64Image = await convertToBase64(file)

      // Upload to server
      const response = await fetch('/api/update-profile-picture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData: base64Image }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload profile picture')
      }

      const data = await response.json()

      if (data.success && data.avatar_url) {
        setAvatarUrl(data.avatar_url)
        
        toast({
          title: "Profile Picture Updated",
          description: "Your profile picture has been updated successfully",
        })

        // Reload the page to update the avatar in the auth context
        window.location.reload()
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive",
      })
    } finally {
      setIsUploadingAvatar(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your account details and profile picture</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="h-32 w-32">
              <AvatarImage src={avatarUrl || user?.avatar} alt={user?.username || "User"} />
              <AvatarFallback className="text-2xl">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Change profile picture"
            >
              {isUploadingAvatar ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploadingAvatar ? "Uploading..." : "Upload New Picture"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            JPG, PNG or GIF. Max size 5MB
          </p>
        </div>

        {/* Username Field */}
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          {isEditing ? (
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isLoading} />
          ) : (
            <div className="p-2 border rounded-md bg-muted/20">{user?.username}</div>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="p-2 border rounded-md bg-muted/20">{user?.email}</div>
        </div>

        {/* Member Since Field */}
        <div className="space-y-2">
          <Label htmlFor="member-since">Member Since</Label>
          <div className="p-2 border rounded-md bg-muted/20">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        )}
      </CardFooter>
    </Card>
  )
}
