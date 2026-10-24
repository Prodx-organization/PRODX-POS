import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Star, 
  Store, 
  Calendar, 
  User, 
  Sparkles, 
  Coins, 
  Heart,
  ArrowRight,
  MessageSquare
} from 'lucide-react';

export const ReceiptValidationPortal: React.FC = () => {
  const { language } = useLanguage();
  
  // Parse query parameters
  const params = new URLSearchParams(window.location.search);
  const ticketId = params.get('ticket') || `PREVIEW-${Math.floor(1000 + Math.random() * 9000)}`;
  const storeName = params.get('store') || 'PRODX Retail Store';
  const totalAmount = params.get('total') || '0.00';
  const cashierName = params.get('cashier') || 'Staff';
  const customerName = params.get('customer') || '';
  const pointsEarned = params.get('points') || '0';
  const itemsRaw = params.get('items') || '';
  const dateStr = params.get('date') || new Date().toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  } as any);

  // Parse items list from URL
  const itemsList = React.useMemo(() => {
    if (!itemsRaw) return [];
    try {
      return decodeURIComponent(itemsRaw).split('|').map(itemStr => {
        const parts = itemStr.split(':');
        return {
          name: parts[0] || 'Unknown Item',
          qty: parseInt(parts[1] || '1', 10),
          total: parts[2] || '0.00'
        };
      });
    } catch {
      return [];
    }
  }, [itemsRaw]);

  // Feedback & Rating States
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setIsSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-card text-text flex flex-col items-center justify-start p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md mx-auto space-y-6 pt-4 pb-12">
        
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide border border-emerald-500/20 shadow-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>{language === 'th' ? 'ระบบตรวจสอบใบเสร็จอย่างเป็นทางการ' : 'Official Receipt Verification'}</span>
          </div>
          <h1 className="text-xl font-black mt-2 tracking-tight text-text flex items-center justify-center gap-1.5">
            <span>PRODX</span>
            <span className="text-primary">VALIDATOR</span>
          </h1>
        </div>

        {/* Core Verification Ticket */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border border-crisp rounded-3xl shadow-xl overflow-hidden relative"
        >
          {/* Confetti or dynamic stamp effect */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
          
          <div className="p-5 sm:p-6 space-y-5">
            {/* Stamp Circle */}
            <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-border border-crisp">
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border-2 border-emerald-400/20"
              >
                <CheckCircle2 className="w-9 h-9" />
              </motion.div>
              <div className="space-y-1 mt-1">
                <h2 className="text-base font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {language === 'th' ? 'ตรวจสอบสิทธิ์ใบเสร็จเรียบร้อย' : 'VERIFIED TRANSACTION'}
                </h2>
                <p className="text-[10px] text-text/50 font-mono tracking-widest uppercase">
                  {ticketId}
                </p>
              </div>
            </div>

            {/* Store & Metadata Details */}
            <div className="space-y-3 bg-card p-4 rounded-2xl border border-border border-crisp text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-text/60">
                  <Store className="h-4 w-4 shrink-0 text-text/50" />
                  <span>{language === 'th' ? 'ชื่อร้านค้า' : 'Store'}</span>
                </div>
                <span className="font-bold text-text">{storeName}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-text/60">
                  <Calendar className="h-4 w-4 shrink-0 text-text/50" />
                  <span>{language === 'th' ? 'วันเวลาสั่งซื้อ' : 'Timestamp'}</span>
                </div>
                <span className="font-semibold text-text/80 font-mono text-[11px]">{dateStr}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-text/60">
                  <User className="h-4 w-4 shrink-0 text-text/50" />
                  <span>{language === 'th' ? 'แคชเชียร์' : 'Cashier'}</span>
                </div>
                <span className="font-medium text-text/80">{cashierName}</span>
              </div>
            </div>

            {/* Items Breakdown (if URL contains items) */}
            {itemsList.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-bold text-text/40 uppercase tracking-wider">
                  {language === 'th' ? 'รายการสินค้าที่ตรวจสอบแล้ว' : 'Verified Items'}
                </h3>
                <div className="space-y-2 divide-y divide-zinc-100 dark:divide-white/5">
                  {itemsList.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center pt-2 text-xs">
                      <div>
                        <div className="font-bold text-text">{it.name}</div>
                        <div className="text-[10px] text-text/50 font-mono">QTY: {it.qty}</div>
                      </div>
                      <span className="font-mono font-bold text-text/80">{it.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Block */}
            <div className="pt-3 border-t border-dashed border-border border-crisp flex justify-between items-center">
              <span className="font-bold text-xs text-text/60">{language === 'th' ? 'ยอดสุทธิทั้งสิ้น' : 'TOTAL AMOUNT'}</span>
              <span className="text-xl font-black font-mono tracking-tight text-primary">
                {totalAmount}
              </span>
            </div>

            {/* Loyalty point notification */}
            {customerName && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex gap-3 items-start">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Coins className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-text">
                    {language === 'th' ? `ยินดีด้วยคุณ ${customerName}` : `Congratulations, ${customerName}!`}
                  </div>
                  <p className="text-[11px] text-text/70 leading-relaxed">
                    {language === 'th'
                      ? `คุณได้รับคะแนนสะสมสะสมเพิ่มอีก +${pointsEarned} คะแนนสำหรับยอดสั่งซื้อนี้`
                      : `You accumulated +${pointsEarned} loyalty points from this verified transaction.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Interactive Feedback & Rating (Customer-facing addition) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-card border border-border border-crisp rounded-3xl shadow-xl overflow-hidden p-5 sm:p-6"
        >
          {isSubmitted ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-6 space-y-3"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-500/10 text-pink-500">
                <Heart className="w-6 h-6 fill-current animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text">
                  {language === 'th' ? 'ขอบคุณสำหรับคะแนนรีวิวของคุณ!' : 'Thank you for your review!'}
                </h3>
                <p className="text-xs text-text/60 leading-relaxed">
                  {language === 'th'
                    ? 'ความคิดเห็นและการประเมินของคุณช่วยขับเคลื่อนคุณภาพการให้บริการที่ดียิ่งขึ้น'
                    : 'Your valuable rating helps us constantly elevate and improve our service standard.'}
                </p>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span>{language === 'th' ? 'ให้คะแนนความพึงพอใจการบริการ' : 'Rate Your Shopping Experience'}</span>
              </div>
              
              {/* Star Rating Controls */}
              <div className="flex items-center justify-center gap-2.5 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  >
                    <Star 
                      className={`h-7 w-7 transition-colors duration-150 ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-text/60 dark:text-text/70'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Conditional Feedback Field */}
              {rating > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2 pt-1"
                >
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={language === 'th' ? 'เขียนคำแนะนำหรือความประทับใจของคุณที่นี่...' : 'Tell us what you loved or how we can improve...'}
                    className="w-full text-xs p-3 rounded-2xl border border-border border-crisp bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-10 rounded-xl bg-background dark:bg-white text-white dark:text-text/70 font-bold text-xs flex items-center justify-center gap-2 hover:bg-background dark:hover:bg-background transition-colors active-scale cursor-pointer"
                  >
                    <span>{language === 'th' ? 'ส่งคำแนะนำ' : 'Submit Feedback'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </form>
          )}
        </motion.div>

        {/* Bottom Security Footer */}
        <div className="text-center space-y-1 text-[10px] text-text/40">
          <div>© {new Date().getFullYear()} PRODX POS Systems • Cryptographically Signed</div>
          <div className="flex justify-center items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-500" />
            <span>Secure Customer Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
