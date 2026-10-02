import React from 'react';
import { ShieldCheck, Sparkles, WifiOff } from 'lucide-react';
import { ProdxLogo } from '../../../components/common/ProdxLogo';
import { STAFF_ACCOUNTS } from '../staffAccounts';

interface ShowcasePanelProps {
  language: 'th' | 'en';
  storeCode: string;
  registerId: string;
}

const LOGO_ON_DARK = { '--text-color': '#F8FAFC', '--text-muted': '#A1A1AA' } as React.CSSProperties;

export const ShowcasePanel: React.FC<ShowcasePanelProps> = ({ language, storeCode, registerId }) => (
  <aside className="relative hidden flex-col justify-between border-r border-[rgba(255,255,255,0.06)] p-12 lg:flex lg:w-5/12 xl:w-1/2 xl:p-16">
    <div style={LOGO_ON_DARK}>
      <ProdxLogo variant="horizontal" size="lg" showTagline={true} />
    </div>

    <div className="max-w-lg space-y-8">
      <div className="space-y-5">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
          {language === 'th' ? 'สถานีขายระดับองค์กร' : 'Enterprise POS terminal'}
        </span>
        <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-neutral-50 xl:text-5xl">
          {language === 'th' ? 'เริ่มกะขาย ปลอดภัยในไม่กี่วินาที' : 'Start your shift in seconds, securely.'}
        </h1>
        <p className="text-base leading-relaxed text-neutral-400">
          {language === 'th'
            ? 'รองรับการทำงานออฟไลน์ ควบคุมสิทธิ์ตามบทบาท และบันทึกทุกธุรกรรมเพื่อการตรวจสอบย้อนหลัง'
            : 'Offline-first selling, role-based permissions and an audit trail for every transaction.'}
        </p>
      </div>

      <ul className="space-y-2.5">
        {STAFF_ACCOUNTS.map((account) => (
          <li
            key={account.id}
            className="login-glass flex items-center gap-4 rounded-2xl p-3.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.16)]"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-neutral-950 ${account.avatarClass}`}
              aria-hidden="true"
            >
              {account.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-neutral-100">{account.role}</span>
              <span className="block truncate text-xs text-neutral-500">{account.roleSummary[language]}</span>
            </span>
            <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${account.pillClass}`}>
              {account.roleLabel[language]}
            </span>
          </li>
        ))}
      </ul>
    </div>

    <div className="flex items-center gap-6 text-xs text-neutral-500">
      <span className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="login-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="font-mono">
          {storeCode} · {registerId}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-violet-300" strokeWidth={1.75} />
        PCI-DSS · FIDO2
      </span>
      <span className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-emerald-300" strokeWidth={1.75} />
        {language === 'th' ? 'ออฟไลน์พร้อม' : 'Offline ready'}
      </span>
    </div>
  </aside>
);
