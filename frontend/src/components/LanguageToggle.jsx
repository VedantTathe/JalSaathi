import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageToggle = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button
        onClick={toggleLanguage}
        className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-xl border border-gray-200 text-primary-600 font-bold hover:bg-gray-50 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
        title={language === 'en' ? "Switch to Marathi" : "Switch to English"}
      >
        {language === 'en' ? 'म' : 'EN'}
      </button>
    </div>
  );
};

export default LanguageToggle;
