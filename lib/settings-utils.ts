import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Define the structure of the site settings
export type SiteSettings = {
    site_name: string;
    logo_text: string;
    site_suffix: string;
    seo_title: string;
    seo_description: string;
    custom_favicon_url: string;
    language: string;
    pricing: any;
    features: {
        face_swap: boolean;
    };
};

// Define default settings to be used as a fallback
const defaultSettings: SiteSettings = {
    site_name: "Girlzone",
    logo_text: "Girlzone",
    site_suffix: ".ai",
    seo_title: "Girlzone - Your AI Companion",
    seo_description: "Explore and chat with AI characters on Girlzone",
    custom_favicon_url: "",
    language: "en",
    features: {
        face_swap: true
    },
    pricing: {
        currency: "$",
        currencyPosition: "left",
        monthly: { price: 12.99, originalPrice: 19.99, discount: 35 },
        quarterly: { price: 9.99, originalPrice: 19.99, discount: 50 },
        yearly: { price: 5.99, originalPrice: 19.99, discount: 70 },
    },
};

// This function fetches site settings directly from the database on the server
export async function getSiteSettings(): Promise<SiteSettings> {
    const supabase = createServerComponentClient({ cookies });

    try {
        const { data, error } = await supabase
            .from("site_settings")
            .select("key, value")
            .in("key", [
                "site_name",
                "logo_text",
                "site_suffix",
                "seo_title",
                "seo_description",
                "custom_favicon_url",
                "language",
                "features",
                "pricing",
                "primary_hue",
                "primary_saturation",
                "primary_lightness",
                "background_light_hue",
                "background_light_saturation",
                "background_light_lightness",
                "foreground_light_hue",
                "foreground_light_saturation",
                "foreground_light_lightness",
                "background_dark_hue",
                "background_dark_saturation",
                "background_dark_lightness",
                "foreground_dark_hue",
                "foreground_dark_saturation",
                "foreground_dark_lightness",
                "card_light_hue",
                "card_light_saturation",
                "card_light_lightness",
                "card_dark_hue",
                "card_dark_saturation",
                "card_dark_lightness",
                "border_light_hue",
                "border_light_saturation",
                "border_light_lightness",
                "border_dark_hue",
                "border_dark_saturation",
                "border_dark_lightness",
            ]);

        if (error) {
            console.error("Error fetching site settings:", error);
            return defaultSettings;
        }

        const settings: any = {};
        if (data) {
            data.forEach(setting => {
                try {
                    settings[setting.key] = JSON.parse(setting.value);
                } catch {
                    settings[setting.key] = setting.value;
                }
            });
        }

        // Merge fetched settings with defaults to ensure all keys are present
        return {
            ...defaultSettings,
            ...settings,
        };
    } catch (error) {
        console.error("Error in getSiteSettings:", error);
        return defaultSettings;
    }
}
