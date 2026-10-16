import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, ShieldAlert, GitMerge, Check, X, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export interface ConflictData {
  id: string;
  type: string;
  idempotencyKey: string;
  createdAt: string;
  localPayload: any;
  cloudPayload: any;
  errorMessage?: string;
}

export interface ConflictResolutionDialogProps {
  isOpen: boolean;
  conflict: ConflictData | null;
  onResolve: (resolution: 'keep_local' | 'keep_cloud' | 'merge') => void;
  onClose: () => void;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  isOpen,
  conflict,
  onResolve,
  onClose,
}) => {
  const { language } = useLanguage();

  if (!isOpen || !conflict) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card text-text w-full max-w-2xl rounded-3xl shadow-2xl border border-rose-500/30 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-700 dark:text-rose-400">
                {language === 'th' ? 'ตรวจพบความขัดแย้งของข้อมูล (Data Conflict Detected)' : 'Data Synchronization Conflict Detected'}
              </h2>
              <p className="text-xs text-text-muted">
                {language === 'th'
                  ? 'ข้อมูลในเครื่อง (Local) และข้อมูลบนคลาวด์ (Cloud) มีการแก้ไขเปลี่ยนแปลงขัดแย้งกัน กรุณาเลือกเวอร์ชันที่ต้องการเก็บรักษา'
                  : 'Local and cloud versions conflict. Please choose which version to retain.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-card-hover rounded-xl text-text-muted hover:text-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Details Body */}
        <div className="p-6 space-y-6">
          <div className="bg-background p-4 rounded-2xl border border-border space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-text uppercase">
                {conflict.type.replace(/_/g, ' ')}
              </span>
              <Badge variant="danger" size="sm">
                Conflict Requires Attention
              </Badge>
            </div>
            <div className="text-text-muted font-mono">
              Idempotency Key: {conflict.idempotencyKey} • Created: {new Date(conflict.createdAt).toLocaleString('th-TH')}
            </div>
            {conflict.errorMessage && (
              <div className="text-rose-600 dark:text-rose-400 font-medium pt-1">
                Error: {conflict.errorMessage}
              </div>
            )}
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Local Version */}
            <div className="bg-card p-4 rounded-2xl border border-border flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-primary">
                    {language === 'th' ? 'เวอร์ชันในเครื่อง (Local)' : 'Local Version'}
                  </span>
                  <Badge variant="primary" size="sm">Client</Badge>
                </div>
                <pre className="bg-background p-3 rounded-xl text-xs font-mono overflow-x-auto max-h-48 text-text/90 border border-border">
                  {JSON.stringify(conflict.localPayload, null, 2)}
                </pre>
              </div>
              <Button
                variant="primary"
                onClick={() => onResolve('keep_local')}
                className="w-full text-xs"
              >
                {language === 'th' ? 'เก็บเวอร์ชันเครื่อง (Keep Local)' : 'Keep Local Version'}
              </Button>
            </div>

            {/* Cloud Version */}
            <div className="bg-card p-4 rounded-2xl border border-border flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">
                    {language === 'th' ? 'เวอร์ชันบนคลาวด์ (Cloud)' : 'Cloud Version'}
                  </span>
                  <Badge variant="warning" size="sm">Server</Badge>
                </div>
                <pre className="bg-background p-3 rounded-xl text-xs font-mono overflow-x-auto max-h-48 text-text/90 border border-border">
                  {JSON.stringify(conflict.cloudPayload, null, 2)}
                </pre>
              </div>
              <Button
                variant="outline"
                onClick={() => onResolve('keep_cloud')}
                className="w-full text-xs"
              >
                {language === 'th' ? 'เก็บเวอร์ชันคลาวด์ (Keep Cloud)' : 'Keep Cloud Version'}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-card-hover/20 border-t border-border flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResolve('merge')}
          >
            <GitMerge className="w-3.5 h-3.5 mr-1.5" />
            {language === 'th' ? 'ผสานข้อมูลทั้งสอง (Auto-Merge)' : 'Merge Both Versions'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            {language === 'th' ? 'ไว้ภายหลัง' : 'Resolve Later'}
          </Button>
        </div>
      </div>
    </div>
  );
};
