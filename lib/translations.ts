export type TranslationKey =
  | "general.siteName"
  | "general.welcome"
  | "general.save"
  | "general.cancel"
  | "general.loading"
  | "general.error"
  | "general.success"
  | "admin.settings"
  | "admin.language"
  | "admin.languageDescription"
  | "admin.selectLanguage"
  | "admin.english"
  | "admin.swedish"
  | "admin.stripeIntegration"
  | "admin.stripeDescription"
  | "admin.stripeSecretKey"
  | "admin.stripeSecretKeyDescription"
  | "admin.stripeWebhookSecret"
  | "admin.stripeWebhookSecretDescription"
  | "admin.saveSettings"
  | "admin.settingsSaved"
  | "admin.settingsError"

export type Translations = {
  [key in TranslationKey]: string
}

export const translations: Record<"en" | "sv", Translations> = {
  en: {
    "general.siteName": "AI Character Explorer",
    "general.welcome": "Welcome",
    "general.save": "Save",
    "general.cancel": "Cancel",
    "general.loading": "Loading...",
    "general.error": "An error occurred",
    "general.success": "Success",
    "admin.settings": "Admin Settings",
    "admin.language": "Language",
    "admin.languageDescription": "Set the default language for the application",
    "admin.selectLanguage": "Select language",
    "admin.english": "English",
    "admin.swedish": "Swedish",
    "admin.stripeIntegration": "Stripe Integration",
    "admin.stripeDescription": "Configure your Stripe API keys for payment processing",
    "admin.stripeSecretKey": "Stripe Secret Key",
    "admin.stripeSecretKeyDescription": "Your Stripe secret key. Never share this key publicly.",
    "admin.stripeWebhookSecret": "Stripe Webhook Secret",
    "admin.stripeWebhookSecretDescription": "Your Stripe webhook secret for verifying webhook events.",
    "admin.saveSettings": "Save Settings",
    "admin.settingsSaved": "Settings saved successfully",
    "admin.settingsError": "Failed to save settings",
  },
  sv: {
    "general.siteName": "AI Karaktärsutforskare",
    "general.welcome": "Välkommen",
    "general.save": "Spara",
    "general.cancel": "Avbryt",
    "general.loading": "Laddar...",
    "general.error": "Ett fel inträffade",
    "general.success": "Framgång",
    "admin.settings": "Administratörsinställningar",
    "admin.language": "Språk",
    "admin.languageDescription": "Ställ in standardspråk för applikationen",
    "admin.selectLanguage": "Välj språk",
    "admin.english": "Engelska",
    "admin.swedish": "Svenska",
    "admin.stripeIntegration": "Stripe Integration",
    "admin.stripeDescription": "Konfigurera dina Stripe API-nycklar för betalningsbehandling",
    "admin.stripeSecretKey": "Stripe Hemlig Nyckel",
    "admin.stripeSecretKeyDescription": "Din hemliga Stripe-nyckel. Dela aldrig denna nyckel offentligt.",
    "admin.stripeWebhookSecret": "Stripe Webhook Hemlighet",
    "admin.stripeWebhookSecretDescription": "Din Stripe webhook-hemlighet för att verifiera webhook-händelser.",
    "admin.saveSettings": "Spara Inställningar",
    "admin.settingsSaved": "Inställningar sparades framgångsrikt",
    "admin.settingsError": "Det gick inte att spara inställningarna",
  },
}
