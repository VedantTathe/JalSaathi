import React, { createContext, useState, useContext, useEffect } from 'react';
import { en } from '../translations/en';
import { mr } from '../translations/mr';

const LanguageContext = createContext();

export const useLanguage = () => {
  return useContext(LanguageContext);
};

export const LanguageProvider = ({ children }) => {
  // Try to load language from localStorage, default to 'mr' (Marathi)
  const [language, setLanguage] = useState(() => {
    const savedLang = localStorage.getItem('app_language');
    return savedLang || 'mr';
  });

  const translations = {
    en,
    mr
  };

  // Helper to get nested value from object string path e.g. "landing.heroTitle"
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const t = (key) => {
    // Attempt to get the translation in the current language
    const translation = getNestedValue(translations[language], key);
    
    // Fallback to English if translation is missing
    if (translation === undefined && language !== 'en') {
      const fallbackTranslation = getNestedValue(translations.en, key);
      return fallbackTranslation || key;
    }
    
    return translation || key;
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'mr' : 'en';
    setLanguage(newLang);
    localStorage.setItem('app_language', newLang);
  };

  useEffect(() => {
    // Optionally set html lang attribute
    document.documentElement.lang = language;
  }, [language]);

  const value = {
    language,
    t,
    toggleLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
