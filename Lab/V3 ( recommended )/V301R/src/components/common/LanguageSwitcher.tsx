import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Update document direction when language changes
    const currentLang = i18n.language || 'fa';
    document.documentElement.dir = currentLang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fa' ? 'en' : 'fa';
    i18n.changeLanguage(newLang);
  };

  const currentLang = i18n.language === 'fa' ? 'فا' : 'En';

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors w-full md:w-auto justify-start md:justify-center"
      title={i18n.language === 'fa' ? 'Switch to English' : 'تغییر به فارسی'}
    >
      <Globe className="w-4 h-4 flex-shrink-0" />
      <span>{currentLang}</span>
    </button>
  );
};

