import React from 'react';
import type { StaffAccount, StaffId } from '../staffAccounts';

interface StaffPickerProps {
  accounts: readonly StaffAccount[];
  selectedId: StaffId;
  onSelect: (id: StaffId) => void;
  language: 'th' | 'en';
  legend: string;
}

export const StaffPicker: React.FC<StaffPickerProps> = ({ accounts, selectedId, onSelect, language, legend }) => (
  <fieldset className="min-w-0">
    <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{legend}</legend>
    <div className="grid grid-cols-3 gap-2.5">
      {accounts.map((account) => {
        const isSelected = selectedId === account.id;
        return (
          <button
            key={account.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(account.id)}
            className={`group relative flex min-w-0 flex-col items-center gap-2 rounded-2xl border px-2 pb-3 pt-3.5 text-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 ${
              isSelected
                ? account.selectedClass
                : 'border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.025)] hover:border-[rgba(255,255,255,0.16)] hover:bg-[rgba(255,255,255,0.05)]'
            }`}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-neutral-950 shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 ${account.avatarClass} ${
                isSelected ? 'scale-105' : 'opacity-80'
              }`}
              aria-hidden="true"
            >
              {account.initials}
            </span>
            <span className="w-full min-w-0">
              <span className={`block truncate text-[13px] font-semibold ${isSelected ? 'text-neutral-50' : 'text-neutral-300'}`}>
                {account.firstName}
              </span>
              <span
                className={`mt-1.5 inline-block max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-4 ${account.pillClass}`}
              >
                {account.roleLabel[language]}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  </fieldset>
);
