import React, { useState, useEffect } from 'react';
import { Customer } from '../../domain/order';
import { Modal } from '../../components/common/Modal';
import { SearchInput } from '../../components/common/SearchInput';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { UserCheck, Star, UserPlus } from 'lucide-react';
import { customersService } from '../../services/customersService';

export interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  onClose,
  selectedCustomer,
  onSelectCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [customersList, setCustomersList] = useState<Customer[]>(() => customersService.getCustomers());
  const { t, language } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      setCustomersList(customersService.getCustomers());
    }
  }, [isOpen]);

  const filtered = customersList.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleChoose = (c: Customer) => {
    onSelectCustomer(c);
    onClose();
  };

  const handleDetach = () => {
    onSelectCustomer(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'th' ? 'เลือกลูกค้า / สมาชิกผูกกับบิล' : 'Attach Customer to Sale'}
      description={language === 'th' ? 'สะสมคะแนน ส่วนลดตามระดับสมาชิก และบันทึกประวัติการซื้อ' : 'Apply loyalty points, tier discounts, and order history.'}
      maxWidth="md"
    >
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder={t.customers.searchPlaceholder}
        />

        {selectedCustomer && (
          <div className="p-3.5 rounded-lg border-crisp border border-border bg-card text-text flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserCheck className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">
                  {language === 'th' ? 'ลูกค้าที่เลือกอยู่:' : 'Currently Attached:'} {selectedCustomer.name}
                </div>
                <div className="text-[11px] text-text/70 font-mono truncate">
                  {selectedCustomer.phone} · {selectedCustomer.loyaltyPoints} {language === 'th' ? 'คะแนน' : 'pts'}
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleDetach} className="min-h-[36px] px-3 shrink-0 rounded-lg border-crisp border-border hover:bg-background text-text shadow-2xs">
              {language === 'th' ? 'ยกเลิกการเลือก' : 'Detach'}
            </Button>
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
          {filtered.map((c) => {
            const isCurrent = selectedCustomer?.id === c.id;
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => handleChoose(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleChoose(c);
                  }
                }}
                className={`min-h-[52px] p-3.5 rounded-lg border-crisp border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.99] ${
                  isCurrent
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 bg-card'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-text flex items-center gap-2">
                    <span>{c.name}</span>
                    <Badge variant={c.loyaltyTier === 'VIP' ? 'purple' : 'neutral'} size="sm">
                      {c.loyaltyTier}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-text/70 mt-0.5 font-mono">
                    {c.phone} · {c.email}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    <span>{c.loyaltyPoints} {language === 'th' ? 'คะแนน' : 'pts'}</span>
                  </div>
                  <div className="text-[10px] text-text/50">{language === 'th' ? 'ยอดคะแนนสะสม' : 'Loyalty balance'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
