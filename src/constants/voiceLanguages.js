export const VOICE_LANGUAGES = [
  { code: "en-US", name: "English (US)", nativeName: "English (US)", flag: "🇺🇸" },
  { code: "en-IN", name: "English (India)", nativeName: "English (India)", flag: "🇮🇳" },
  { code: "en-GB", name: "English (UK)", nativeName: "English (UK)", flag: "🇬🇧" },
  { code: "te-IN", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  { code: "hi-IN", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ta-IN", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "kn-IN", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ml-IN", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳" },
  { code: "mr-IN", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
  { code: "bn-IN", name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳" },
  { code: "gu-IN", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳" },
  { code: "pa-IN", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "ur-IN", name: "Urdu", nativeName: "اردو", flag: "🇮🇳" },
  { code: "es-ES", name: "Spanish (Spain)", nativeName: "Español", flag: "🇪🇸" },
  { code: "es-MX", name: "Spanish (Mexico)", nativeName: "Español (México)", flag: "🇲🇽" },
  { code: "fr-FR", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de-DE", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it-IT", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "ja-JP", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko-KR", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "zh-CN", name: "Chinese (Mandarin)", nativeName: "中文 (普通话)", flag: "🇨🇳" },
  { code: "ar-SA", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "ru-RU", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", flag: "🇧🇷" },
  { code: "tr-TR", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "vi-VN", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "id-ID", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "nl-NL", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "pl-PL", name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
  { code: "sv-SE", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪" }
];

export const DEFAULT_VOICE_LANG = VOICE_LANGUAGES[0]; // en-US

/**
 * Validates a language code against the catalog.
 * Returns the matching language object or DEFAULT_VOICE_LANG if code is invalid/corrupted.
 */
export const getValidVoiceLang = (code) => {
  if (!code || typeof code !== "string") return DEFAULT_VOICE_LANG;
  const match = VOICE_LANGUAGES.find(
    (lang) => lang.code.toLowerCase() === code.trim().toLowerCase()
  );
  return match || DEFAULT_VOICE_LANG;
};
