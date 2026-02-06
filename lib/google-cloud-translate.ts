// Google Cloud Translate API utility functions
// This file provides functions to interact with Google Cloud Translate API for real-time translations

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

// Google Cloud Translate API configuration
const GOOGLE_TRANSLATE_API_BASE = 'https://translation.googleapis.com/language/translate/v2';
const GOOGLE_TRANSLATE_LANGUAGES_BASE = 'https://translation.googleapis.com/language/translate/v2/languages';

/**
 * Google Cloud Translate API client
 * This is a wrapper around the official Google Cloud Translate API
 * Provides the same interface as @google-cloud/translate for easy migration
 */
export class TranslateV2 {
  private apiKey: string;

  constructor(options?: { key?: string }) {
    this.apiKey = options?.key || process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API;
  }

  /**
   * Translate text using Google Cloud Translate API
   */
  async translate(text: string, options?: {
    from?: string;
    to?: string;
    format?: 'text' | 'html';
  }): Promise<TranslationResponse> {
    if (!this.apiKey) {
      throw new Error('Google Cloud Translate API key not configured');
    }

    const target = options?.to || 'en';
    const source = options?.from;
    const format = options?.format || 'text';

    const params = new URLSearchParams({
      key: this.apiKey,
      q: text,
      target,
      format
    });

    if (source) {
      params.append('source', source);
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
        throw new Error(`Google Cloud Translate API error: ${response.status} ${response.statusText}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ''
        }`);
      }

      const data = await response.json();
      
      if (!data.data || !data.data.translations || !data.data.translations[0]) {
        throw new Error('Invalid response format from Google Cloud Translate API');
      }

      const translation = data.data.translations[0];
      
      return {
        translatedText: translation.translatedText,
        detectedSourceLanguage: translation.detectedSourceLanguage
      };
    } catch (error) {
      console.error('Google Cloud Translate error:', error);
      throw error;
    }
  }

  /**
   * Batch translate multiple texts
   */
  async translateBatch(texts: string[], options?: {
    from?: string;
    to?: string;
    format?: 'text' | 'html';
  }): Promise<TranslationResponse[]> {
    const promises = texts.map(text => this.translate(text, options));
    return Promise.all(promises);
  }

  /**
   * Get list of supported languages
   */
  async getSupportedLanguages(targetLanguage = 'en'): Promise<SupportedLanguage[]> {
    if (!this.apiKey) {
      throw new Error('Google Cloud Translate API key not configured');
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
}

// Default instance compatible with @google-cloud/translate interface
export const getGoogleCloudTranslateClient = () => {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API;
  
  if (!apiKey) {
    throw new Error('Google Cloud Translate API key not found in environment variables');
  }
  
  return new TranslateV2({ key: apiKey });
};

// Export compatibility with @google-cloud/translate
export const translateText = async (text: string, targetLanguage: string, sourceLanguage?: string): Promise<string> => {
  const client = getGoogleCloudTranslateClient();
  const response = await client.translate(text, {
    from: sourceLanguage,
    to: targetLanguage
  });
  return response.translatedText;
};

// Export language utilities
export const getLanguageName = (code: string): string => {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  return language ? language.nativeName : code.toUpperCase();
};

// Comprehensive supported languages list
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文(简体)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '中文(繁體)' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskera' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
  { code: 'my', name: 'Burmese', nativeName: 'ဗမာ' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргыз' },
  { code: 'uz', name: 'Uzbek', nativeName: "O'zbek" },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол' },
  { code: 'bo', name: 'Tibetan', nativeName: 'བོད་ཡིག' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'jw', name: 'Javanese', nativeName: 'Basa Jawa' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa' },
  { code: 'to', name: 'Tongan', nativeName: 'Lea faka-Tonga' },
  { code: 'fj', name: 'Fijian', nativeName: 'Vosa Vakaviti' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي' },
  { code: 'ckb', name: 'Central Kurdish', nativeName: 'کوردی ناوەندی' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ' },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo' },
  { code: 'so', name: 'Somali', nativeName: 'Af-Soomaali' },
];
