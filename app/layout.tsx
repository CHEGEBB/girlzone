import type React from "react"
import { Poppins } from "next/font/google"
import type { Metadata } from "next"
import { AuthProvider } from "@/components/auth-context"
import { AuthModalProvider } from "@/components/auth-modal-context"
import { AuthModals } from "@/components/auth-modals"
import { LanguageProvider } from "@/components/language-context"
import ClientRootLayout from "./ClientRootLayout"
import { MobileNav } from "@/components/mobile-nav"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { getSiteSettings } from "@/lib/settings-utils";
import { generateSiteMetadata } from "@/lib/metadata-utils";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
})

// Generate dynamic metadata based on site settings
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return generateSiteMetadata(settings);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased flex flex-col mobile-container", poppins.variable)}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LanguageProvider>
            <AuthProvider>
              <AuthModalProvider>
                <ClientRootLayout settings={settings}>
                  <div className="flex-1 flex flex-col">{children}</div>
                </ClientRootLayout>
                <MobileNav />
                <AuthModals />
              </AuthModalProvider>
            </AuthProvider>
          </LanguageProvider>
          <Toaster />
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
