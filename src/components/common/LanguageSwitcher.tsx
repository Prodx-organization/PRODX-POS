import React from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { AVAILABLE_LANGUAGES, SupportedLanguage } from '../../i18n/types';
import { getZIndexClass } from '../../utils/ZIndexManager';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] justify-center rounded-xl border border-border border-crisp bg-background/80 hover:bg-background text-text/80 hover:text-text text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95"
        aria-label={t.topNav.selectLang}
      >
        <Globe className="h-3.5 w-3.5 text-text/60" />
        <span>{AVAILABLE_LANGUAGES[language as SupportedLanguage]?.flag || '🌐'} {language.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div
          className={`${getZIndexClass('dropdown')} absolute right-0 mt-2 w-48 max-w-[90vw] overflow-x-hidden rounded-2xl border border-border border-crisp bg-card shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-100`}
          onMouseLeave={() => setIsOpen(false)}
        >
          {Object.values(AVAILABLE_LANGUAGES).map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 min-h-[44px] text-xs flex items-center justify-between cursor-pointer hover:bg-background/80 transition-colors ${
                  isSelected ? 'font-bold text-primary bg-primary/10' : 'text-text/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{lang.flag}</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs leading-tight">{lang.nativeName}</span>
                    <span className="text-[10px] text-text/50">{lang.name}</span>
                  </div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
