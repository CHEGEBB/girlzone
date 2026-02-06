import type React from "react"

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile viewport optimization */}
        <div className="flex-1 overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
