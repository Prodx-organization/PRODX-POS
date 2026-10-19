import React, { useEffect } from 'react';
import { KeyRound, Lock, Fingerprint, QrCode, UserRound, ArrowRight, X, Loader2 } from 'lucide-react';
import { useSound } from '../../context/SoundContext';

interface OperatorPinPadProps {
  isThai: boolean;
  terminalReady: boolean;
  isLoading: boolean;
  pin: string;
  onPinInput: (digit: string) => void;
  onPinClear: () => void;
  onPinDelete: () => void;
  onSubmit: () => void;
  onSwitchMode: (mode: 'pin' | 'biometric' | 'qr' | 'email') => void;
  onForgotPin: () => void;
  onTriggerScopeError: () => void;
}

export const OperatorPinPad: React.FC<OperatorPinPadProps> = ({
  isThai,
  terminalReady,
  isLoading,
  pin,
  onPinInput,
  onPinClear,
  onPinDelete,
  onSubmit,
  onSwitchMode,
  onForgotPin,
  onTriggerScopeError,
}) => {
  const { playClick, playSuccess, playCriticalAlert } = useSound();

  const handleDigitPress = (digit: string) => {
    playClick();
    onPinInput(digit);
  };

  const handleClearPress = () => {
    playClick();
    onPinClear();
  };

  const handleDeletePress = () => {
    playClick();
    onPinDelete();
  };

  const handleSubmitPress = () => {
    playClick();
    onSubmit();
  };

  // Physical keyboard numpad listener with tactile audio/haptic click
  useEffect(() => {
    if (!terminalReady) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        playClick();
        onPinInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        playClick();
        onPinDelete();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        e.preventDefault();
        playClick();
        onSubmit();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        playClick();
        onPinClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [terminalReady, pin, onPinInput, onPinDelete, onSubmit, onPinClear, playClick]);

  return (
    <div className="space-y-3">
      {/* PIN Dots */}
      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-9 h-11 sm:w-11 sm:h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${
              pin.length > i
                ? 'border-primary bg-primary/5 text-primary scale-105 shadow-2xs'
                : 'border-slate-100 bg-slate-50'
            }`}
          >
            {pin.length > i ? <div className="w-2.5 h-2.5 rounded-full bg-primary" /> : null}
          </div>
        ))}
      </div>

      {/* Numpad Grid */}
      <div className="grid grid-cols-3 gap-1.5 max-w-[320px] mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            type="button"
            key={digit}
            disabled={!terminalReady || isLoading}
            onClick={() => handleDigitPress(digit.toString())}
            className="h-11 sm:h-12 rounded-xl bg-white border-2 border-slate-100 text-base font-black text-slate-900 hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-[0.96] transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs select-none"
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          disabled={!terminalReady || isLoading}
          onClick={handleClearPress}
          className="h-11 sm:h-12 rounded-xl bg-slate-50 text-slate-500 font-extrabold text-[11px] uppercase hover:bg-rose-50 hover:text-rose-600 active:scale-[0.96] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none"
        >
          {isThai ? 'ล้าง' : 'Clear'}
        </button>
        <button
          type="button"
          disabled={!terminalReady || isLoading}
          onClick={() => handleDigitPress('0')}
          className="h-11 sm:h-12 rounded-xl bg-white border-2 border-slate-100 text-base font-black text-slate-900 hover:border-primary hover:bg-primary/5 active:scale-[0.96] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs select-none"
        >
          0
        </button>
        <button
          type="button"
          disabled={!terminalReady || isLoading}
          onClick={handleDeletePress}
          className="h-11 sm:h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-[0.96] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Submit CTA */}
      <div className="max-w-[320px] mx-auto space-y-2">
        <button
          type="button"
          disabled={!terminalReady || pin.length < 4 || isLoading}
          onClick={handleSubmitPress}
          className="w-full h-11 px-5 bg-primary text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-md shadow-primary/20 cursor-pointer whitespace-nowrap"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <span className="truncate">{isThai ? 'เข้าสู่ระบบ POS' : 'Sign in to POS Terminal'}</span>
          )}
        </button>

        {/* Secondary Navigation Options */}
        <div className="flex items-center justify-between pt-1 text-xs font-bold text-slate-600">
          <button
            type="button"
            disabled={!terminalReady}
            onClick={() => {
              playClick();
              onSwitchMode('biometric');
            }}
            className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Fingerprint className="w-3.5 h-3.5 text-primary" />
            <span>{isThai ? 'ชีวมิติ' : 'Biometric'}</span>
          </button>
          <button
            type="button"
            disabled={!terminalReady}
            onClick={() => {
              playClick();
              onSwitchMode('qr');
            }}
            className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-primary" />
            <span>{isThai ? 'สแกน QR' : 'QR Badge'}</span>
          </button>
          <button
            type="button"
            disabled={!terminalReady}
            onClick={() => {
              playClick();
              onSwitchMode('email');
            }}
            className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
          >
            <UserRound className="w-3.5 h-3.5 text-primary" />
            <span>{isThai ? 'บัญชีพนักงาน' : 'Staff ID'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
