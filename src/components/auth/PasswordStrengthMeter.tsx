import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { PasswordAnalysis } from '../../utils/passwordSecurity';

interface PasswordStrengthMeterProps {
  analysis: PasswordAnalysis;
  language?: string;
  showCriteriaList?: boolean;
  showEntropyInfo?: boolean;
  compact?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  analysis,
  language: rawLang = 'th',
  showCriteriaList = true,
  showEntropyInfo = true,
  compact = false,
}) => {
  const lang = rawLang === 'th' ? 'th' : 'en';
  const [showDetails, setShowDetails] = useState(!compact);

  const getMeterSegments = () => {
    // 5 segments representing strength levels
    const levels = [20, 40, 60, 80, 100];
    return levels.map((threshold, idx) => {
      const isFilled = analysis.score >= threshold;
      let segmentColor = 'bg-slate-200';
      if (isFilled) {
        if (analysis.score < 30) segmentColor = 'bg-rose-500';
        else if (analysis.score < 50) segmentColor = 'bg-primary';
        else if (analysis.score < 75) segmentColor = 'bg-amber-500';
        else if (analysis.score < 90) segmentColor = 'bg-indigo-500';
        else segmentColor = 'bg-emerald-500';
      }
      return (
        <div
          key={idx}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${segmentColor}`}
        />
      );
    });
  };

  return (
    <div className="w-full space-y-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 text-xs">
      {/* Top Header: Score & Tier Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck
            className={`w-4 h-4 ${
              analysis.isPolicyCompliant ? 'text-emerald-600' : 'text-slate-400'
            }`}
          />
          <span className="font-bold text-slate-800">
            {lang === 'th' ? 'ความปลอดภัยรหัสผ่าน' : 'Password Strength'}
          </span>
          <span className="font-mono text-[11px] font-black text-slate-600">
            {analysis.score}%
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${analysis.badgeBg} ${analysis.badgeText}`}
          >
            {lang === 'th' ? analysis.tierLabelTh : analysis.tierLabelEn}
          </span>
          {compact && (
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              title={showDetails ? 'Hide criteria' : 'Show criteria'}
            >
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Segmented Strength Bar */}
      <div className="space-y-1">
        <div className="flex gap-1.5 w-full">{getMeterSegments()}</div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>{lang === 'th' ? 'ระดับต่ำ' : 'Weak'}</span>
          <span>{lang === 'th' ? 'ปานกลาง' : 'Moderate'}</span>
          <span>{lang === 'th' ? 'ปลอดภัยระดับองค์กร' : 'Enterprise'}</span>
        </div>
      </div>

      {/* Criteria Checklist */}
      {showCriteriaList && showDetails && (
        <div className="pt-2 border-t border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            <span>{lang === 'th' ? 'เกณฑ์ความปลอดภัยขั้นต่ำ (Policy Criteria)' : 'Security Policy Requirements'}</span>
            <span
              className={`font-mono font-bold ${
                analysis.isPolicyCompliant ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {analysis.criteria.filter((c) => c.isMet).length} / {analysis.criteria.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {analysis.criteria.map((criterion) => {
              const isMet = criterion.isMet;
              return (
                <div
                  key={criterion.id}
                  className={`flex items-start gap-2 p-1.5 rounded-lg border transition-all duration-150 ${
                    isMet
                      ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isMet ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-[11px] font-semibold leading-tight ${
                        isMet ? 'text-emerald-950 font-bold' : 'text-slate-700'
                      }`}
                    >
                      {lang === 'th' ? criterion.labelTh : criterion.labelEn}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Suggestions or Warnings */}
          {analysis.suggestionsEn.length > 0 && !analysis.isPolicyCompliant && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <div className="leading-snug">
                {lang === 'th' ? analysis.suggestionsTh[0] : analysis.suggestionsEn[0]}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Telemetry Entropy & Crack Time Estimation */}
      {showEntropyInfo && showDetails && (
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>
              {lang === 'th' ? 'เวลาคาดการณ์ถอดรหัส:' : 'Est. Crack Time:'}{' '}
              <strong className="text-slate-700">
                {lang === 'th' ? analysis.estimatedCrackTimeTh : analysis.estimatedCrackTimeEn}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-slate-400" />
            <span>
              Entropy: <strong className="text-slate-700">{analysis.entropyBits} bits</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
