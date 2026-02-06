// Google Translate API utility functions
// This file provides functions to interact with Google Translate API for real-time translations

export interface TranslationRequest {
  q: string; // Text to translate
  source?: string; // Source language (optional, auto-detect if not provided)
  target: string; // Target language
  format?: 'text' | 'html'; // Text format
}

export interface TranslationResponse {
  translatedText: string;
  detectedSourceLanguage?: string;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

const GOOGLE_TRANSLATE_API_BASE = 'https://translation.googleapis.com/language/translate/v2';
const GOOGLE_TRANSLATE_LANGUAGES_BASE = 'https://translation.googleapis.com/language/translate/v2/languages';

export class GoogleTranslateAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Translate text using Google Translate API
   */
  async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    if (!this.apiKey) {
      throw new Error('Google Translate API key not configured');
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      q: request.q,
      target: request.target,
      format: request.format || 'text'
    });

    if (request.source) {
      params.append('source', request.source);
    }

    try {
      const response = await fetch(`${GOOGLE_TRANSLATE_API_BASE}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Translation API error: ${response.status} ${response.statusText}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ''
        }`);
      }

      const data = await response.json();
      
      if (!data.data || !data.data.translations || !data.data.translations[0]) {
        throw new Error('Invalid response format from translation API');
      }

      const translation = data.data.translations[0];
      
      return {
        translatedText: translation.translatedText,
        detectedSourceLanguage: translation.detectedSourceLanguage
      };
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  /**
   * Get list of supported languages
   */
  async getSupportedLanguages(targetLanguage = 'en'): Promise<SupportedLanguage[]> {
    if (!this.apiKey) {
      throw new Error('Google Translate API key not configured');
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      target: targetLanguage
    });

    try {
      const response = await fetch(`${GOOGLE_TRANSLATE_LANGUAGES_BASE}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Languages API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data || !data.data.languages) {
        throw new Error('Invalid response format from languages API');
      }

      return data.data.languages.map((lang: any) => ({
        code: lang.language,
        name: lang.name,
        nativeName: lang.name // Google Translate API doesn't provide native name separately in v2
      }));
    } catch (error) {
      console.error('Languages fetch error:', error);
      throw error;
    }
  }

  /**
   * Batch translate multiple texts
   */
  async batchTranslate(texts: string[], target: string, source?: string, format: 'text' | 'html' = 'text'): Promise<TranslationResponse[]> {
    if (!this.apiKey) {
      throw new Error('Google Translate API key not configured');
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      target: target,
      format: format
    });

    if (source) {
      params.append('source', source);
    }

    // Append multiple 'q' parameters
    texts.forEach(text => params.append('q', text));

    try {
      const response = await fetch(`${GOOGLE_TRANSLATE_API_BASE}?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Translation API error: ${response.status} ${response.statusText}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ''
        }`);
      }

      const data = await response.json();
      
      if (!data.data || !data.data.translations) {
        throw new Error('Invalid response format from translation API');
      }

      return data.data.translations.map((t: any) => ({
        translatedText: t.translatedText,
        detectedSourceLanguage: t.detectedSourceLanguage
      }));
    } catch (error) {
      console.error('Batch translation error:', error);
      throw error;
    }
  }
}

// Default instance
export const getGoogleTranslateClient = () => {
  const apiKey = process.env.GOOGLE_TRANSLATE_API || process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Translate API key not found in environment variables');
  }
  
  return new GoogleTranslateAPI(apiKey);
};

// Supported languages - limited to requested languages only
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
];

// Export utility functions for easy use
export const translateText = async (text: string, targetLanguage: string, sourceLanguage?: string): Promise<string> => {
  const client = getGoogleTranslateClient();
  const response = await client.translateText({
    q: text,
    target: targetLanguage,
    source: sourceLanguage
  });
  return response.translatedText;
};

export const getLanguageName = (code: string): string => {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  return language ? language.nativeName : code.toUpperCase();
};
