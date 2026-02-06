import type { Metadata } from "next";
import { SiteSettings } from "./settings-utils";

// This function generates dynamic metadata based on the fetched site settings
export function generateSiteMetadata(settings: SiteSettings): Metadata {
    const title = settings.seo_title || `${settings.site_name} - Your AI Companion`;
    const description = settings.seo_description || `Explore and chat with AI characters on ${settings.site_name}`;
    const logoText = settings.site_name || settings.logo_text || "Girlzone";
    const customFaviconUrl = settings.custom_favicon_url || "";

    // Use custom favicon if available, otherwise use default static files

    const iconConfig: any[] = [
        { url: "/favicon.png?v=3", type: "image/png" },
        { url: "/apple-touch-icon.png?v=3", type: "image/png" },
    ];

    if (customFaviconUrl) {
        iconConfig.push({ url: `${customFaviconUrl}?v=2`, type: "image/png" });
    }

    return {
        title,
        description,
        viewport: {
            width: "device-width",
            initialScale: 1,
            maximumScale: 1,
            userScalable: false,
            viewportFit: "cover",
        },
        icons: {
            icon: iconConfig,
            apple: customFaviconUrl || "/apple-touch-icon.png",
        },
        generator: "v0.dev",
    };
}
