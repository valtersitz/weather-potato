import { useState, useEffect } from 'react';
import { translations } from '../i18n/translations';
import type { Language } from '../types';
import { STORAGE_LANGUAGE } from '../utils/constants';

export const useI18n = () => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Check for saved language preference
    const savedLang = localStorage.getItem(STORAGE_LANGUAGE);
    if (savedLang && savedLang in translations) {
      setLanguageState(savedLang as Language);
      return;
    }

    // Detect browser language
    const browserLang = navigator.language.split('-')[0] as Language;

    if (browserLang in translations) {
      setLanguageState(browserLang);
    } else {
      setLanguageState('en'); // Default to English
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_LANGUAGE, lang);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  return { t, language, setLanguage };
};
