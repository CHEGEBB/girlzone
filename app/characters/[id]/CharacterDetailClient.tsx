"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Globe, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { GenerateImageButton } from "@/components/generate-image-button"
import { EditCharacterButton } from "@/components/edit-character-button"
import { DeleteCharacterButton } from "@/components/delete-character-button"
import { CharacterTabs } from "@/components/character-tabs"
import { useLanguage } from "@/components/language-context"

interface CharacterDetailClientProps {
  character: any
  id: string
  isOwner: boolean
}

export default function CharacterDetailClient({ character, id, isOwner }: CharacterDetailClientProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Top Action Bar - Responsive Layout */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <Button
          variant="ghost"
          asChild
          className="w-full justify-start min-h-[48px] sm:min-h-[44px] touch-manipulation"
        >
          <Link href="/my-ai" className="flex items-center">
            <ArrowLeft className="mr-2 h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="text-base sm:text-sm">{t("pages.character.backToMyAI")}</span>
          </Link>
        </Button>

        <div className="grid gap-2">
          <Button
            asChild
            className="w-full min-h-[52px] sm:min-h-[44px] touch-manipulation font-semibold text-base sm:text-sm"
          >
            <Link href={`/chat/${id}`} className="flex items-center justify-center">
              <MessageCircle className="mr-2 h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>{t("pages.character.startChat")}</span>
            </Link>
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <GenerateImageButton character={character} />
            {isOwner && <EditCharacterButton character={character} />}
            {isOwner && (
              <DeleteCharacterButton
                characterId={id}
                characterName={character.name}
              />
            )}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4 sm:gap-5 md:gap-6">
            <div className="w-full md:w-1/3 flex-shrink-0">
              <div className="relative aspect-square overflow-hidden rounded-lg shadow-lg ring-1 ring-black/5">
                {character.image ? (
                  <Image
                    src={character.image || "/placeholder.svg"}
                    alt={character.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground">{t("pages.character.noImage")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full md:w-2/3 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-3 sm:mb-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words leading-tight">
                  {character.name}
                </h1>
                {character.is_public && (
                  <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center text-xs font-medium w-fit flex-shrink-0">
                    <Globe className="h-3 w-3 mr-1.5 flex-shrink-0" />
                    <span>{t("pages.character.publicBadge")}</span>
                  </div>
                )}
              </div>

              {character.description && (
                <div className="mb-3 sm:mb-4">
                  <h2 className="text-sm sm:text-base md:text-lg font-semibold mb-1.5 sm:mb-2 text-foreground">
                    {t("pages.character.descriptionHeading")}
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground break-words leading-relaxed">
                    {character.description}
                  </p>
                </div>
              )}

              {character.system_prompt && (
                <div>
                  <h2 className="text-sm sm:text-base md:text-lg font-semibold mb-1.5 sm:mb-2 text-foreground">
                    {t("pages.character.systemPromptHeading")}
                  </h2>
                  <div className="bg-muted/50 p-3 rounded-lg overflow-x-auto border border-border/50">
                    <pre className="whitespace-pre-wrap text-xs sm:text-sm break-words overflow-wrap-anywhere leading-relaxed font-mono">
                      {character.system_prompt}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Character Tabs */}
      <CharacterTabs character={character} characterId={id} />
    </div>
  )
}
