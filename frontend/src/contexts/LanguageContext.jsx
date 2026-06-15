import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
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

  const [cache, setCache] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dynamic_translations_cache') || '{}');
    } catch {
      return {};
    }
  });

  const fetchingKeys = useRef(new Set());

  const translations = {
    en,
    mr
  };

  // Helper to get nested value from object string path e.g. "landing.heroTitle"
  const getNestedValue = (obj, path) => {
    if (!path || typeof path !== 'string') return path;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const fetchTranslation = async (text, targetLang, cacheKey) => {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data[0]) {
        const translatedText = data[0].map(item => item[0]).join('');
        
        setCache(prev => {
          const newCache = { ...prev, [cacheKey]: translatedText };
          localStorage.setItem('dynamic_translations_cache', JSON.stringify(newCache));
          return newCache;
        });
      }
    } catch (err) {
      console.error("Translation API error:", err);
    }
  };

  const t = (key) => {
    if (!key) return key;

    // 1. Try static dictionary first
    const staticTranslation = getNestedValue(translations[language], key);
    if (staticTranslation !== undefined) return staticTranslation;

    // 2. If it's English or translation is missing, fallback to English static dictionary
    const englishFallback = getNestedValue(translations.en, key);
    const baseText = englishFallback !== undefined ? englishFallback : key;

    if (language === 'en') return baseText;

    // 3. Check dynamic cache for the base text
    const cacheKey = `${language}_${baseText}`;
    if (cache[cacheKey]) return cache[cacheKey];

    // 4. Trigger background translation if not already fetching
    if (!fetchingKeys.current.has(cacheKey)) {
      fetchingKeys.current.add(cacheKey);
      fetchTranslation(baseText, language, cacheKey);
    }

    // 5. Return the English base text while waiting for translation
    return baseText;
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'mr' : 'en';
    setLanguage(newLang);
    localStorage.setItem('app_language', newLang);
  };

  useEffect(() => {
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
