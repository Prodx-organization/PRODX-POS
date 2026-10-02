import React from 'react';

export const LoginBackdrop: React.FC = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="login-aurora absolute -left-1/4 -top-1/4 h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.32),transparent)] blur-3xl" />
    <div
      className="login-aurora absolute -bottom-1/3 -right-1/4 h-[55vmax] w-[55vmax] rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.16),transparent)] blur-3xl"
      style={{ animationDelay: '-6s' }}
    />
    <div
      className="absolute inset-0 opacity-[0.5]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        maskImage: 'radial-gradient(ellipse 70% 55% at 50% 30%, #000 20%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 30%, #000 20%, transparent 75%)',
      }}
    />
  </div>
);
