"use client"

import Link from "next/link"
import { useSite } from "@/components/site-context"
import { useLanguage } from "@/components/language-context"

export function SiteFooter() {
  const currentYear = new Date().getFullYear()
  const { settings } = useSite()
  const { t } = useLanguage()

  const footerLinks = {
    features: [
      { title: t("nav.generateImage"), href: "/generate" },
      { title: t("footer.aiChat"), href: "/chat" },
    ],
    community: [
      { title: "Discord", href: "https://discord.com" },
      { title: "Twitter", href: "https://twitter.com" },
    ],
    legal: [
      { title: t("nav.privacy"), href: "/privacy" },
      { title: t("nav.terms"), href: "/terms" },
      { title: t("footer.legalHub"), href: "/legal" },
    ],
  }

  return (
    <footer className="bg-[#111] text-white border-t border-gray-800 mt-auto">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="text-2xl font-bold">
              {settings.logoText}<span className="text-orange">{settings.siteSuffix}</span>
            </Link>
            <p className="text-gray-400 text-sm max-w-xs">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Links */}
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-4">{t("footer.features")}</h3>
              <ul className="space-y-3">
                {footerLinks.features.map(link => (
                  <li key={link.title}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t("footer.community")}</h3>
              <ul className="space-y-3">
                {footerLinks.community.map(link => (
                  <li key={link.title}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t("footer.legal")}</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map(link => (
                  <li key={link.title}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} {settings.siteName}. {t("footer.allRightsReserved")}
          </p>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {/* Language Selector can be added here if needed */}
          </div>
        </div>
      </div>
    </footer>
  )
}
