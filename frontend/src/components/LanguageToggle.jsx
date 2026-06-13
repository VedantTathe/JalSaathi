import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageToggle = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center justify-center px-3 py-1.5 bg-white text-primary-600 rounded-lg shadow-sm border border-gray-200 font-bold hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
      title={language === 'en' ? "Switch to Marathi" : "Switch to English"}
    >
      {language === 'en' ? 'मराठी' : 'EN'}
    </button>
  );
};

export default LanguageToggle;
