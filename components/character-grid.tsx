"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { CharacterCard } from "./character-card"
import { formatDistanceToNow } from "date-fns"
import type { Character } from "@/types/character"
import { useIsMobile } from "@/hooks/use-mobile"

interface CharacterGridProps {
  characters: Character[]
  selectedTab?: string
  showOnlyWithChatHistory?: boolean
}

export function CharacterGrid({
  characters = [],
  selectedTab = "All",
  showOnlyWithChatHistory = false,
}: CharacterGridProps) {
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([])
  const [displayedCharacters, setDisplayedCharacters] = useState<Character[]>([])
  const [page, setPage] = useState(1)
  const observerTarget = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const ITEMS_PER_PAGE = 16

  // Safe date formatting function
  const formatDate = (dateString?: string) => {
    try {
      if (!dateString) return "Recently"

      const date = new Date(dateString)

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", dateString)
        return "Recently"
      }

      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Recently"
    }
  }

  useEffect(() => {
    // Filter characters based on selected tab
    if (selectedTab === "All") {
      setFilteredCharacters(characters)
    } else {
      setFilteredCharacters(characters.filter((character) => character.category === selectedTab))
    }
  }, [characters, selectedTab])

  useEffect(() => {
    if (showOnlyWithChatHistory) {
      // Filter to only show characters with chat history
      // This is a simplified check - in a real app, you'd check local storage or database
      const charactersWithHistory = characters.filter((character) => {
        try {
          const history = localStorage.getItem(`chat:${character.id}`)
          return history && JSON.parse(history).length > 0
        } catch (error) {
          console.error("Error checking chat history:", error)
          return false
        }
      })
      setFilteredCharacters(charactersWithHistory)
    }
  }, [characters, showOnlyWithChatHistory])

  // Reset pagination when filtered characters change
  useEffect(() => {
    setPage(1)
    setDisplayedCharacters(filteredCharacters.slice(0, ITEMS_PER_PAGE))
  }, [filteredCharacters])

  // Load more characters when page changes
  useEffect(() => {
    const startIndex = 0
    const endIndex = page * ITEMS_PER_PAGE
    setDisplayedCharacters(filteredCharacters.slice(startIndex, endIndex))
  }, [page, filteredCharacters])

  // Intersection Observer callback to load more characters
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && displayedCharacters.length < filteredCharacters.length) {
        setPage((prev) => prev + 1)
      }
    },
    [displayedCharacters.length, filteredCharacters.length]
  )

  // Set up Intersection Observer
  useEffect(() => {
    const element = observerTarget.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "200px", // Load more when user is 200px from the bottom
      threshold: 0.1,
    })

    observer.observe(element)

    return () => {
      if (element) {
        observer.unobserve(element)
      }
    }
  }, [handleObserver])

  return (
    <>
      <div className={`grid ${isMobile ? 'grid-cols-2 gap-3 px-4' : 'grid-cols-2 gap-4 px-4 md:px-6 lg:px-8 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} ${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto ${isMobile ? 'mt-3' : 'mt-4'}`}>
        {displayedCharacters.map((character) => (
          <CharacterCard key={character.id} character={character} />
        ))}
      </div>
      
      {/* Intersection Observer target for infinite scroll */}
      {displayedCharacters.length < filteredCharacters.length && (
        <div ref={observerTarget} className="h-20 flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading more characters...</div>
        </div>
      )}
    </>
  )
}
