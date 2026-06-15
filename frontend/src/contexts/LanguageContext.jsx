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
    // When using Google Translate DOM widget, we always render the English text 
    // to the DOM and let Google handle the translation to the target language.
    const englishTranslation = getNestedValue(translations.en, key);
    return englishTranslation || key;
  };

  const triggerGoogleTranslate = (langCode) => {
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event('change'));
    }
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'mr' : 'en';
    setLanguage(newLang);
    localStorage.setItem('app_language', newLang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    
    // Slight delay to ensure Google Translate script is loaded
    setTimeout(() => {
      triggerGoogleTranslate(language);
    }, 500);
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
