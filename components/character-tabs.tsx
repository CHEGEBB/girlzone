"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CharacterGallery } from "@/components/character-gallery"

interface CharacterTabsProps {
  character: any
  characterId: string
}

export function CharacterTabs({ character, characterId }: CharacterTabsProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'gallery'>('details')

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-2 border-b-2 border-border overflow-x-auto pb-0 scrollbar-hide">
        <Button
          variant={activeTab === 'details' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('details')}
          className={`rounded-b-none rounded-t-lg border-b-2 min-h-[48px] sm:min-h-[44px] whitespace-nowrap flex-1 sm:flex-initial touch-manipulation font-medium transition-all ${
            activeTab === 'details' 
              ? 'border-primary shadow-sm' 
              : 'border-transparent hover:border-border/50'
          }`}
        >
          <span className="text-sm sm:text-base px-2">Character Details</span>
        </Button>
        <Button
          variant={activeTab === 'gallery' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('gallery')}
          className={`rounded-b-none rounded-t-lg border-b-2 min-h-[48px] sm:min-h-[44px] whitespace-nowrap flex-1 sm:flex-initial touch-manipulation font-medium transition-all ${
            activeTab === 'gallery' 
              ? 'border-primary shadow-sm' 
              : 'border-transparent hover:border-border/50'
          }`}
        >
          <span className="text-sm sm:text-base px-2">Gallery</span>
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">Character Details</h2>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
              {character.age && (
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/30 hover:bg-muted/70 transition-colors">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Age</h3>
                  <p className="text-base sm:text-lg font-medium break-words leading-tight">{character.age}</p>
                </div>
              )}
              {character.ethnicity && (
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/30 hover:bg-muted/70 transition-colors">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Ethnicity</h3>
                  <p className="text-base sm:text-lg font-medium break-words leading-tight">{character.ethnicity}</p>
                </div>
              )}
              {character.relationship && (
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/30 hover:bg-muted/70 transition-colors">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Relationship</h3>
                  <p className="text-base sm:text-lg font-medium break-words leading-tight">{character.relationship}</p>
                </div>
              )}
              {character.personality && (
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/30 hover:bg-muted/70 transition-colors">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Personality</h3>
                  <p className="text-base sm:text-lg font-medium break-words leading-tight">{character.personality}</p>
                </div>
              )}
              {character.occupation && (
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/30 hover:bg-muted/70 transition-colors">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Occupation</h3>
                  <p className="text-base sm:text-lg font-medium break-words leading-tight">{character.occupation}</p>
                </div>
              )}
              {character.hobbies && (
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/30 hover:bg-muted/70 transition-colors">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Hobbies</h3>
                  <p className="text-base sm:text-lg font-medium break-words leading-tight">{character.hobbies}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'gallery' && (
        <CharacterGallery characterId={characterId} />
      )}
    </div>
  )
}
