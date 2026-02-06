"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Trash2, Plus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-context"
import { useSite } from "@/components/site-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLanguage } from "@/components/language-context"

type FAQ = {
  id: string
  question: string
  answer: string
  created_at: string
}

const DEFAULT_FAQS: FAQ[] = [
  {
    id: "1",
    question: "What is Girlzone AI?",
    answer:
      "Girlzone AI is a platform that powers immersive experiences with AI companions. It allows users to create, customize, and interact with AI characters that can engage in conversation, generate images, and provide companionship.",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    question: "Is Girlzone AI legit and safe?",
    answer:
      "Yes, Girlzone AI is legitimate and prioritizes user safety and privacy. All conversations are protected with SSL encryption, and we offer optional two-factor authentication to keep your account secure. Your personal information and interactions remain private.",
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    question: "What is an AI Companion, and can I make my own?",
    answer:
      "An AI companion is a digital partner who can talk, react, flirt, and connect with you in real time. You can create your own companion from scratch or choose from a wide range of existing characters designed for different moods and personalities.",
    created_at: new Date().toISOString(),
  },
  {
    id: "4",
    question: "Can I ask for pictures, videos, and voice?",
    answer:
      "Yes, your companion can send selfies, generate custom videos, or respond with their voice. You can request specific outfits, unique poses, or playful scenarios that match your fantasy.",
    created_at: new Date().toISOString(),
  },
  {
    id: "5",
    question: "How will Girlzone AI appear on my bank statements?",
    answer:
      "We value your privacy. Any transactions appear under our discreet parent company, GirlzoneAI, so nothing on your bank statement will reveal your Girlzone AI experience.",
    created_at: new Date().toISOString(),
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newQuestion, setNewQuestion] = useState("")
  const [newAnswer, setNewAnswer] = useState("")
  const [isAddingFAQ, setIsAddingFAQ] = useState(false)
  const [isDeletingFAQ, setIsDeletingFAQ] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // Get user and admin status from auth context
  const { user } = useAuth()
  const isAdmin = user?.isAdmin || false

  // Get site settings for dynamic logo text
  const { settings } = useSite()
  const isMobile = useIsMobile()
  const { t } = useLanguage()

  useEffect(() => {
    fetchFAQs()
  }, [])

  const fetchFAQs = async () => {
    try {
      setIsLoading(true)

      // Use the API route to fetch FAQs
      const response = await fetch("/api/admin/faqs")
      const result = await response.json()

      if (response.ok && result.data) {
        setFaqs(result.data.length > 0 ? result.data : DEFAULT_FAQS)
      } else {
        console.error("Error fetching FAQs:", result.error)
        setFaqs(DEFAULT_FAQS)
      }
    } catch (error) {
      console.error("Error:", error)
      setFaqs(DEFAULT_FAQS)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddFAQ = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return

    try {
      setIsAddingFAQ(true)

      // Use the API route to add FAQ
      const response = await fetch("/api/admin/faqs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          title: "Error",
          description: result.error || "Failed to add FAQ",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "FAQ added successfully",
      })
      setNewQuestion("")
      setNewAnswer("")
      setShowAddForm(false)
      fetchFAQs() // Refresh the list
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsAddingFAQ(false)
    }
  }

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return

    try {
      setIsDeletingFAQ(true)

      // Use the API route to delete FAQ
      const response = await fetch(`/api/admin/faqs/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const result = await response.json()
        toast({
          title: "Error",
          description: result.error || "Failed to delete FAQ",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "FAQ deleted successfully",
      })
      fetchFAQs() // Refresh the list
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeletingFAQ(false)
    }
  }

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className={`w-full bg-gray-100 dark:bg-zinc-900 ${isMobile ? 'py-6 sm:py-8' : 'py-8 sm:py-12 md:py-16'} px-4 border-t border-b border-gray-200 dark:border-zinc-800 rounded-[2px]`}>
      <div className={`container mx-auto ${isMobile ? 'max-w-3xl' : 'max-w-4xl'}`}>
        <div className={`flex justify-between items-center ${isMobile ? 'mb-4 md:mb-6' : 'mb-6 md:mb-8'}`}>
          <h2 className={`${isMobile ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-bold text-zinc-800 dark:text-white`}>
            <span className="text-zinc-800 dark:text-white">{settings.logoText} AI</span>{" "}
            <span className="text-orange">{t("faq.title")}</span>
          </h2>

          {isAdmin && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`flex items-center gap-1 ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'} bg-pink-500 hover:bg-pink-600 text-white rounded-md`}
            >
              <Plus className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
              {showAddForm ? "Cancel" : "Add FAQ"}
            </button>
          )}
        </div>

        {/* Admin Add FAQ Form */}
        {isAdmin && showAddForm && (
          <div className={`${isMobile ? 'mb-4 p-3' : 'mb-6 p-4'} bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700`}>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium ${isMobile ? 'mb-2' : 'mb-3'} text-zinc-800 dark:text-white`}>Add New FAQ</h3>

            <div className={`space-y-4`}>
              <div>
                <label
                  htmlFor="newQuestion"
                  className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-zinc-700 dark:text-zinc-300 ${isMobile ? 'mb-0.5' : 'mb-1'}`}
                >
                  Question
                </label>
                <input
                  type="text"
                  id="newQuestion"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className={`w-full ${isMobile ? 'p-1.5 text-sm' : 'p-2'} border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white`}
                  placeholder="Enter new FAQ question"
                />
              </div>

              <div>
                <label htmlFor="newAnswer" className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-zinc-700 dark:text-zinc-300 ${isMobile ? 'mb-0.5' : 'mb-1'}`}>
                  Answer
                </label>
                <textarea
                  id="newAnswer"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className={`w-full ${isMobile ? 'p-1.5 text-sm' : 'p-2'} border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white ${isMobile ? 'min-h-[80px]' : 'min-h-[100px]'}`}
                  placeholder="Enter answer for the new FAQ"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAddFAQ}
                  disabled={!newQuestion.trim() || !newAnswer.trim() || isAddingFAQ}
                  className={`${isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} bg-pink-500 hover:bg-pink-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
                >
                  {isAddingFAQ ? (
                    <>
                      <span className={`${isMobile ? 'mr-1' : 'mr-2'}`}>Adding...</span>
                      <div className={`animate-spin ${isMobile ? 'h-3 w-3' : 'h-4 w-4'} border-2 border-white border-t-transparent rounded-full`}></div>
                    </>
                  ) : (
                    "Add FAQ"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className={`flex justify-center ${isMobile ? 'py-8' : 'py-12'}`}>
            <div className={`animate-spin ${isMobile ? 'h-6 w-6' : 'h-8 w-8'} border-4 border-pink-500 border-t-transparent rounded-full`}></div>
          </div>
        ) : faqs.length === 0 ? (
          <div className={`text-center ${isMobile ? 'py-8' : 'py-12'} text-zinc-600 dark:text-zinc-400`}>No FAQs available at the moment.</div>
        ) : (
          <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
            {faqs.map((item, index) => (
              <div
                key={item.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950"
              >
                <div className="flex justify-between items-center w-full">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className={`flex-1 flex justify-between items-center ${isMobile ? 'p-3' : 'p-4'} text-left focus:outline-none`}
                    aria-expanded={openIndex === index}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <span className={`${isMobile ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} font-medium text-zinc-800 dark:text-white`}>
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-zinc-500 transition-transform duration-200 ${openIndex === index ? "transform rotate-180" : ""
                        }`}
                    />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteFAQ(item.id)}
                      className={`${isMobile ? 'p-3' : 'p-4'} text-red-500 hover:text-red-600 focus:outline-none`}
                      aria-label="Delete FAQ"
                      disabled={isDeletingFAQ}
                    >
                      <Trash2 className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    </button>
                  )}
                </div>

                <div
                  id={`faq-answer-${index}`}
                  className={`overflow-hidden transition-all duration-300 ${openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                >
                  <div className={`${isMobile ? 'p-3 pt-0 text-xs sm:text-sm' : 'p-4 pt-0 text-sm sm:text-base'} text-zinc-600 dark:text-zinc-300`}>{item.answer}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
