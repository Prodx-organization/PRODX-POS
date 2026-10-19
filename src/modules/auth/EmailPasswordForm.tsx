import React, { useState } from 'react';
import { UserRound, Lock, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';

interface EmailPasswordFormProps {
  isThai: boolean;
  terminalReady: boolean;
  isLoading: boolean;
  onSubmit: (email: string, pass: string) => void;
  onSwitchMode: (mode: 'pin' | 'biometric' | 'qr' | 'email') => void;
  onForgotPin: () => void;
}

export const EmailPasswordForm: React.FC<EmailPasswordFormProps> = ({
  isThai,
  terminalReady,
  isLoading,
  onSubmit,
  onSwitchMode,
  onForgotPin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    onSubmit(email.trim(), password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-[340px] mx-auto">
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase text-slate-500">
          {isThai ? 'อีเมลบัญชีผู้ใช้' : 'Account Email'}
        </label>
        <div className="relative">
          <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="email"
            value={email}
            disabled={!terminalReady || isLoading}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cashier@prodx.co"
            required
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase text-slate-500">
          {isThai ? 'รหัสผ่าน' : 'Password'}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            disabled={!terminalReady || isLoading}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={!terminalReady || !email.trim() || !password || isLoading}
        className="w-full h-11 px-4 bg-primary text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-primary-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-primary/20 cursor-pointer whitespace-nowrap"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          <span>{isThai ? 'เข้าสู่ระบบด้วยอีเมล' : 'Sign in with Email'}</span>
        )}
      </button>

      <div className="flex items-center justify-between pt-1 text-xs font-bold text-slate-600">
        <button
          type="button"
          onClick={() => onSwitchMode('pin')}
          className="hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
        >
          <KeyRound className="w-3.5 h-3.5 text-primary" />
          <span>{isThai ? 'ใช้แป้น PIN' : 'Use PIN Pad'}</span>
        </button>
        <button
          type="button"
          onClick={onForgotPin}
          className="text-slate-400 hover:text-primary transition-colors cursor-pointer"
        >
          {isThai ? 'ลืมรหัสผ่าน?' : 'Forgot password?'}
        </button>
      </div>
    </form>
  );
};
