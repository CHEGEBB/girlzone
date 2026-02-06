"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Save, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase-browser"

interface EditCharacterModalProps {
  character: {
    id: string
    name: string
    age: number
    image: string
    description: string
    personality: string
    occupation: string
    hobbies: string
    body: string
    ethnicity: string
    relationship: string
    system_prompt: string
  }
  isOpen: boolean
  onClose: () => void
  onCharacterUpdated: (updatedCharacter: any) => void
}

export function EditCharacterModal({ 
  character, 
  isOpen, 
  onClose, 
  onCharacterUpdated 
}: EditCharacterModalProps) {
  const [formData, setFormData] = useState({
    name: character.name,
    age: character.age,
    description: character.description || "",
    personality: character.personality || "",
    occupation: character.occupation || "",
    hobbies: character.hobbies || "",
    body: character.body || "",
    ethnicity: character.ethnicity || "",
    relationship: character.relationship || "",
    system_prompt: character.system_prompt || "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: character.name,
        age: character.age,
        description: character.description || "",
        personality: character.personality || "",
        occupation: character.occupation || "",
        hobbies: character.hobbies || "",
        body: character.body || "",
        ethnicity: character.ethnicity || "",
        relationship: character.relationship || "",
        system_prompt: character.system_prompt || "",
      })
      setError("")
    }
  }, [isOpen, character])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 18 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")

    try {
      // Get the current user ID using Supabase client
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      if (!userId) {
        throw new Error('You must be logged in to update a character')
      }

      const response = await fetch('/api/update-character', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          userId: userId,
          updates: formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update character')
      }

      const updatedCharacter = { ...character, ...formData }
      onCharacterUpdated(updatedCharacter)
      onClose()
      alert('Character updated successfully!')
    } catch (error) {
      console.error('Error updating character:', error)
      setError(error instanceof Error ? error.message : 'Failed to update character. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Edit Character</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                min="18"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="personality">Personality</Label>
              <Input
                id="personality"
                name="personality"
                value={formData.personality}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="body">Body Type</Label>
              <Input
                id="body"
                name="body"
                value={formData.body}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="ethnicity">Ethnicity</Label>
              <Input
                id="ethnicity"
                name="ethnicity"
                value={formData.ethnicity}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="hobbies">Hobbies</Label>
              <Input
                id="hobbies"
                name="hobbies"
                value={formData.hobbies}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              name="system_prompt"
              value={formData.system_prompt}
              onChange={handleChange}
              rows={4}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
