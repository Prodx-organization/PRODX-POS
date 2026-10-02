import React from 'react';
import { Delete } from 'lucide-react';

interface PinPadProps {
  pin: string;
  length: number;
  hasError: boolean;
  disabled: boolean;
  language: 'th' | 'en';
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

const KEY_BASE =
  'login-key relative flex h-[68px] items-center justify-center rounded-2xl select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 disabled:pointer-events-none disabled:opacity-35';

export const PinPad: React.FC<PinPadProps> = ({ pin, length, hasError, disabled, language, onDigit, onDelete, onClear }) => {
  const digitKey = (digit: string) => (
    <button
      key={digit}
      type="button"
      onClick={() => onDigit(digit)}
      disabled={disabled}
      aria-label={digit}
      className={`${KEY_BASE} font-mono text-[28px] font-medium text-neutral-50`}
    >
      {digit}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className={hasError ? 'login-shake' : ''}>
        <div
          role="status"
          aria-live="polite"
          aria-label={
            language === 'th' ? `กรอกแล้ว ${pin.length} จาก ${length} หลัก` : `${pin.length} of ${length} digits entered`
          }
          className="flex items-center justify-center gap-5"
        >
          {Array.from({ length }, (_, idx) => {
            const isFilled = pin.length > idx;
            return (
              <span
                key={idx}
                className={`block h-3.5 w-3.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  hasError
                    ? 'scale-110 bg-rose-400 shadow-[0_0_18px_2px_rgba(251,113,133,0.55)]'
                    : isFilled
                      ? 'scale-125 bg-violet-300 shadow-[0_0_20px_3px_rgba(167,139,250,0.6)]'
                      : 'bg-[rgba(255,255,255,0.14)]'
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {DIGIT_ROWS.flat().map(digitKey)}
        <button
          type="button"
          onClick={onClear}
          disabled={disabled || pin.length === 0}
          className={`${KEY_BASE} text-xs font-semibold uppercase tracking-widest text-neutral-400`}
        >
          {language === 'th' ? 'ล้าง' : 'Clear'}
        </button>
        {digitKey('0')}
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled || pin.length === 0}
          aria-label={language === 'th' ? 'ลบหลักล่าสุด' : 'Delete last digit'}
          className={`${KEY_BASE} text-neutral-300`}
        >
          <Delete className="h-6 w-6" strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
};
