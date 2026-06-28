import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './locales/en';
import { hi } from './locales/hi';
import { te } from './locales/te';
import { bn } from './locales/bn';
import { kn } from './locales/kn';
import { ta } from './locales/ta';
import { gu } from './locales/gu';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en,
      hi,
      te,
      bn,
      kn,
      ta,
      gu,
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ghc-lang',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
