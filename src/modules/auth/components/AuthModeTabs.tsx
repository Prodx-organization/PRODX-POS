import React from 'react';
import { Fingerprint, KeyRound, User as UserIcon } from 'lucide-react';

export type AuthMode = 'pin' | 'credentials' | 'biometric';

interface AuthModeTabsProps {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
  language: 'th' | 'en';
}

const TABS: { mode: AuthMode; Icon: typeof KeyRound; label: { th: string; en: string } }[] = [
  { mode: 'pin', Icon: KeyRound, label: { th: 'รหัส PIN', en: 'PIN' } },
  { mode: 'credentials', Icon: UserIcon, label: { th: 'รหัสผ่าน', en: 'Password' } },
  { mode: 'biometric', Icon: Fingerprint, label: { th: 'Passkey', en: 'Passkey' } },
];

export const AuthModeTabs: React.FC<AuthModeTabsProps> = ({ mode, onChange, language }) => {
  const activeIndex = TABS.findIndex((tab) => tab.mode === mode);
  return (
    <div
      role="tablist"
      aria-label={language === 'th' ? 'วิธีเข้าสู่ระบบ' : 'Sign-in method'}
      className="login-glass relative grid grid-cols-3 rounded-2xl p-1"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-[rgba(139,92,246,0.22)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_8px_24px_-10px_rgba(139,92,246,0.7)] ring-1 ring-inset ring-violet-300/30 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {TABS.map(({ mode: tabMode, Icon, label }) => {
        const isActive = tabMode === mode;
        return (
          <button
            key={tabMode}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tabMode)}
            className={`relative z-10 flex h-11 items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 ${
              isActive ? 'text-neutral-50' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span>{label[language]}</span>
          </button>
        );
      })}
    </div>
  );
};
