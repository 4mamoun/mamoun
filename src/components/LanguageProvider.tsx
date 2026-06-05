import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Global language direction handler — runs once at app mount */
export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const setDir = () => {
      const lang = i18n.language || 'ar';
      const dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.dir = dir;
      document.documentElement.lang = lang;
      document.body.style.direction = dir;
      document.body.setAttribute('dir', dir);
    };

    setDir();
    i18n.on('languageChanged', setDir);
    return () => { i18n.off('languageChanged', setDir); };
  }, [i18n]);

  return <>{children}</>;
}
