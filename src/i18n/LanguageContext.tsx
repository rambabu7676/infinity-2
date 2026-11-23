import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { AppLanguage } from '../types';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  translations,
  TranslationBundle,
} from './translations';

export function getStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (raw === 'hi' || raw === 'en') {
      return raw;
    }
  } catch {
    // ignore storage access issues
  }
  return DEFAULT_LANGUAGE;
}

export function persistStoredLanguage(lang: AppLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore storage access issues
  }
}

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: TranslationBundle;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: translations[DEFAULT_LANGUAGE],
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => getStoredLanguage());

  const setLanguage = useCallback((lang: AppLanguage) => {
    const normalized: AppLanguage = lang === 'en' ? 'en' : 'hi';
    persistStoredLanguage(normalized);
    setLanguageState(normalized);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: translations[language] || translations[DEFAULT_LANGUAGE],
    }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
