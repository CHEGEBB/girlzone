"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Share2 } from "lucide-react"
import { toast } from "sonner"
import { generateAffiliateUrl, trackAffiliateClick } from "@/lib/affiliate-tracking"

interface AffiliateLinkProps {
  affiliateCode: string
  linkType?: string
  targetUrl?: string
  className?: string
}

export default function AffiliateLink({ 
  affiliateCode, 
  linkType = 'general', 
  targetUrl,
  className 
}: AffiliateLinkProps) {
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [isTracking, setIsTracking] = useState(false)

  useEffect(() => {
    if (affiliateCode) {
      const baseUrl = targetUrl || window.location.origin
      const url = generateAffiliateUrl(baseUrl, affiliateCode, linkType)
      setGeneratedUrl(url)
    }
  }, [affiliateCode, linkType, targetUrl])

  const handleCopy = async () => {
    const copyToClipboardFallback = (text: string) => {
      try {
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.opacity = "0"
        textArea.style.pointerEvents = "none"
        textArea.style.left = "0"
        textArea.style.top = "0"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const successful = document.execCommand('copy')
        if (successful) {
          toast.success('Link copied to clipboard!')
        } else {
          console.error('Fallback: Copy command was unsuccessful')
          toast.error('Failed to copy link')
        }
        
        document.body.removeChild(textArea)
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err)
        toast.error('Failed to copy link')
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(generatedUrl)
        toast.success('Link copied to clipboard!')
      } else {
        copyToClipboardFallback(generatedUrl)
      }
    } catch (error) {
      console.error("Failed to copy link using Clipboard API, trying fallback:", error)
      copyToClipboardFallback(generatedUrl)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this amazing fantasy character platform!',
          text: 'Join me on this incredible fantasy character platform!',
          url: generatedUrl
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback to copying
      handleCopy()
    }
  }

  const handleClick = async () => {
    if (isTracking) return

    setIsTracking(true)
    
    try {
      await trackAffiliateClick({
        affiliate_code: affiliateCode,
        link_type: linkType,
        target_url: targetUrl,
        user_agent: navigator.userAgent,
        referrer: document.referrer
      })
      
      // Open the link
      window.open(generatedUrl, '_blank')
    } catch (error) {
      console.error('Error tracking click:', error)
      // Still open the link even if tracking fails
      window.open(generatedUrl, '_blank')
    } finally {
      setIsTracking(false)
    }
  }

  if (!affiliateCode) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-center">
            No affiliate code available
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Affiliate Link</CardTitle>
            <CardDescription>
              Share this link to earn commissions
            </CardDescription>
          </div>
          <Badge variant="outline" className="capitalize">
            {linkType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            value={generatedUrl}
            readOnly
            className="flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleClick}
            disabled={isTracking}
            className="flex-1"
          >
            {isTracking ? (
              'Tracking...'
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Link
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>• Click tracking is enabled</p>
          <p>• Commissions are calculated automatically</p>
          <p>• Cookie duration: 30 days</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Component for displaying affiliate links in a grid
export function AffiliateLinksGrid({ affiliateCode }: { affiliateCode: string }) {
  const linkTypes = [
    { type: 'general', label: 'General', description: 'Main platform link' },
    { type: 'character', label: 'Character Creation', description: 'Direct to character creation' },
    { type: 'premium', label: 'Premium', description: 'Premium subscription page' },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {linkTypes.map((link) => (
        <AffiliateLink
          key={link.type}
          affiliateCode={affiliateCode}
          linkType={link.type}
          className="h-full"
        />
      ))}
    </div>
  )
}
