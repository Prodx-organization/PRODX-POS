import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

interface LoginDialogProps {
  title: string;
  icon: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({ title, icon, closeLabel, onClose, children }) => {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(3,3,8,0.72)] p-3 backdrop-blur-md sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="login-glass login-sheet-in w-full max-w-md rounded-3xl bg-[#0d0d14] p-6 text-neutral-100"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-400/10 text-violet-300">
              {icon}
            </span>
            <h3 id={titleId} className="text-base font-semibold tracking-tight text-neutral-50">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
