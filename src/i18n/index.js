// i18n initialization for the app
// - Detect language from localStorage or navigator
// - Fallback to 'en'
// - Expose helper setLanguage(lang) that persists and triggers rerender

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Helper: normalize browser language to 'en' | 'vi'
function detectLanguage() {
  try {
    const stored = localStorage.getItem('lang');
    if (stored) return stored;
  } catch {}
  const nav = (navigator.language || 'en').toLowerCase();
  if (nav.startsWith('vi')) return 'vi';
  return 'en';
}

// Lazy resources loading to keep config in one place
// These will be tree-shaken by bundlers
const resources = {
  en: { translation: require('./locales/en.json') },
  vi: { translation: require('./locales/vi.json') },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

// Public helper to switch language from anywhere
export function setLanguage(lang) {
  const normalized = (lang || 'en').toLowerCase();
  const next = normalized.startsWith('vi') ? 'vi' : 'en';
  try { localStorage.setItem('lang', next); } catch {}
  i18n.changeLanguage(next);
}

export default i18n;


