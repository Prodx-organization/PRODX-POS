import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { playScannerSound } from '../../services/soundService';
import { triggerHaptic } from '../../services/hapticService';
import { Mic, MicOff, Sparkles, Volume2 } from 'lucide-react';

export interface VoiceCommandBarProps {
  onSearchQuery?: (q: string) => void;
  onParkCart?: () => void;
  onClearCart?: () => void;
  onQuickPay?: () => void;
}

export const VoiceCommandBar: React.FC<VoiceCommandBarProps> = ({
  onSearchQuery,
  onParkCart,
  onClearCart,
  onQuickPay,
}) => {
  const { language } = useLanguage();
  const { addToast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = true;
        recog.lang = language === 'th' ? 'th-TH' : 'en-US';

        recog.onresult = (e: any) => {
          const current = e.results[e.results.length - 1][0].transcript;
          setTranscript(current);

          if (e.results[e.results.length - 1].isFinal) {
            handleProcessVoiceCommand(current.toLowerCase().trim());
          }
        };

        recog.onerror = (e: any) => {
          console.warn('[VoiceCommand] Recognition error:', e.error);
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        setRecognition(recog);
      }
    }
  }, [language]);

  const handleProcessVoiceCommand = (cmd: string) => {
    triggerHaptic('heavy');
    playScannerSound('click');

    if (cmd.includes('พักบิล') || cmd.includes('park') || cmd.includes('hold')) {
      onParkCart?.();
      addToast({
        title: language === 'th' ? 'คำสั่งเสียง: พักบิล' : 'Voice Command: Park Cart',
        message: cmd,
        type: 'info',
      });
    } else if (cmd.includes('ล้างตะกร้า') || cmd.includes('clear') || cmd.includes('ลบ')) {
      onClearCart?.();
      addToast({
        title: language === 'th' ? 'คำสั่งเสียง: ล้างตะกร้า' : 'Voice Command: Clear Cart',
        message: cmd,
        type: 'info',
      });
    } else if (cmd.includes('จ่ายเงิน') || cmd.includes('ชำระเงิน') || cmd.includes('quick pay') || cmd.includes('checkout')) {
      onQuickPay?.();
      addToast({
        title: language === 'th' ? 'คำสั่งเสียง: ชำระด่วน' : 'Voice Command: Quick-Pay',
        message: cmd,
        type: 'info',
      });
    } else {
      // Treat as search query
      onSearchQuery?.(cmd);
      addToast({
        title: language === 'th' ? `ค้นหาด้วยเสียง: "${cmd}"` : `Voice Search: "${cmd}"`,
        message: language === 'th' ? 'กำลังกรองรายการสินค้าตามเสียงสั่ง' : 'Filtering catalog by spoken phrase',
        type: 'info',
      });
    }
  };

  const toggleListening = () => {
    if (!recognition) {
      addToast({
        title: language === 'th' ? 'ไม่รองรับคำสั่งเสียง' : 'Voice Speech Not Supported',
        message: language === 'th' ? 'เบราว์เซอร์นี้ยังไม่รองรับ Web Speech API' : 'Web Speech API is not supported on this browser.',
        type: 'warning',
      });
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        setTranscript('');
        recognition.start();
        setIsListening(true);
        triggerHaptic('tap');
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`h-10 px-3 rounded-lg border flex items-center gap-1.5 font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95 ${
        isListening
          ? 'bg-rose-500 border-rose-400 text-white animate-pulse ring-2 ring-rose-400/50'
          : 'bg-card hover:bg-background border-border text-text/70 hover:text-text'
      }`}
      title={language === 'th' ? 'คำสั่งเสียงสั่งงาน POS (Hands-Free Speech)' : 'Voice Command (Hands-Free)'}
    >
      {isListening ? (
        <>
          <Mic className="h-4 w-4 animate-bounce text-white" />
          <span className="font-mono text-[11px] truncate max-w-[100px]">
            {transcript || (language === 'th' ? 'กำลังฟัง...' : 'Listening...')}
          </span>
        </>
      ) : (
        <>
          <MicOff className="h-4 w-4 text-text/50" />
          <span className="hidden xl:inline">{language === 'th' ? 'คำสั่งเสียง' : 'Voice'}</span>
        </>
      )}
    </button>
  );
};
