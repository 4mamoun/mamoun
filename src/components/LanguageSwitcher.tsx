import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useEffect } from 'react';
import { setDirection } from '@/i18n';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  useEffect(() => {
    setDirection(i18n.language);
  }, [i18n.language]);

  const toggleLang = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    setDirection(newLang);
  };

  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-xs font-medium text-gray-600"
      title={t('language.switchTo')}
    >
      <Globe className="w-4 h-4" />
      <span className="hidden sm:inline">{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
      <span className="sm:hidden">{i18n.language === 'ar' ? 'EN' : 'AR'}</span>
    </button>
  );
}
