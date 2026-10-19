import React from 'react';
import { Fingerprint, ScanFace, Plus, KeyRound, Loader2 } from 'lucide-react';
import { PasskeyCredentialRecord, WebAuthnCapability } from '../../services/webauthnService';

interface BiometricAuthPanelProps {
  isThai: boolean;
  terminalReady: boolean;
  isLoading: boolean;
  isBiometricVerifying: boolean;
  enrolledPasskeys: PasskeyCredentialRecord[];
  selectedPasskeyId: string;
  webauthnCapability: WebAuthnCapability | null;
  onSelectPasskey: (id: string) => void;
  onScanBiometric: (record?: PasskeyCredentialRecord) => void;
  onOpenEnrollModal: () => void;
  onSwitchMode: (mode: 'pin' | 'biometric' | 'qr' | 'email') => void;
}

export const BiometricAuthPanel: React.FC<BiometricAuthPanelProps> = ({
  isThai,
  terminalReady,
  isLoading,
  isBiometricVerifying,
  enrolledPasskeys,
  selectedPasskeyId,
  webauthnCapability,
  onSelectPasskey,
  onScanBiometric,
  onOpenEnrollModal,
  onSwitchMode,
}) => {
  return (
    <div className="space-y-3 max-w-[340px] mx-auto">
      <div className="rounded-xl border border-slate-800 bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ScanFace className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {isThai ? 'เซ็นเซอร์ชีวมิติพร้อมใช้งาน' : 'Biometric Sensor Ready'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {webauthnCapability?.biometricLabel || 'FIDO2 / WebAuthn Passkey'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenEnrollModal}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3 text-[#ff6b1a]" />
          <span>{isThai ? 'จัดการคีย์' : 'Passkeys'}</span>
        </button>
      </div>

      {/* Enrolled Passkeys */}
      <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-0.5">
        {enrolledPasskeys.map((pk) => {
          const isSelected = pk.id === selectedPasskeyId;
          return (
            <div
              key={pk.id}
              onClick={() => onSelectPasskey(pk.id)}
              className={`rounded-xl border-2 px-3 py-2 flex items-center justify-between gap-2 transition-all cursor-pointer ${
                isSelected ? 'border-primary bg-primary/5 shadow-2xs' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {pk.authenticatorType === 'face_id' ? <ScanFace className="w-4 h-4" /> : <Fingerprint className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-900 truncate">{pk.userName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{pk.deviceLabel}</div>
                </div>
              </div>
              <button
                type="button"
                disabled={!terminalReady || isLoading || isBiometricVerifying}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPasskey(pk.id);
                  onScanBiometric(pk);
                }}
                className="h-7 px-2.5 rounded-lg bg-slate-900 hover:bg-primary text-white text-[10px] font-bold transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isThai ? 'สแกน' : 'Scan'}
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!terminalReady || isLoading || isBiometricVerifying}
        onClick={() => onScanBiometric()}
        className="w-full h-11 px-4 bg-primary text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-primary-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-primary/20 cursor-pointer whitespace-nowrap"
      >
        {isBiometricVerifying || isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{isThai ? 'กำลังตรวจสอบชีวมิติ...' : 'Verifying Biometrics...'}</span>
          </>
        ) : (
          <>
            <Fingerprint className="w-4 h-4 shrink-0" />
            <span>{isThai ? 'สแกนลายนิ้วมือ / Face ID' : 'Sign In with Biometrics'}</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center pt-1">
        <button
          type="button"
          onClick={() => onSwitchMode('pin')}
          className="text-xs font-bold text-slate-600 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
        >
          <KeyRound className="w-3.5 h-3.5 text-primary" />
          <span>{isThai ? 'กลับไปใช้แป้น PIN' : 'Switch to PIN Pad'}</span>
        </button>
      </div>
    </div>
  );
};
