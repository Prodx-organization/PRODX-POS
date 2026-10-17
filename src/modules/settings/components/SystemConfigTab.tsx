import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Monitor, Plus, Trash2, Edit2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { useToast } from '../../../context/ToastContext';
import { Organization, Branch, Terminal } from '../types';

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export const SystemConfigTab: React.FC = () => {
  const { addToast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);

  // Validation logic
  const validateSlug = (slug: string): ValidationResult => {
    if (!/^[a-z0-9-]+$/.test(slug)) return { isValid: false, message: 'Only lowercase letters, numbers, and hyphens.' };
    if (orgs.some(o => o.slug === slug)) return { isValid: false, message: 'Slug must be unique.' };
    return { isValid: true };
  };

  const validateCode = (code: string): ValidationResult => {
    if (terminals.some(t => t.code === code)) return { isValid: false, message: 'Code must be unique.' };
    return { isValid: true };
  };

  useEffect(() => {
    setOrgs([{ id: 'o1', name: 'PRODX Corp', slug: 'prodx', createdAt: Date.now() }]);
    setBranches([{ id: 'b1', orgId: 'o1', name: 'Main Branch', address: '123 Main St', createdAt: Date.now() }]);
    setTerminals([{ id: 't1', branchId: 'b1', name: 'POS-01', code: 'P01', createdAt: Date.now() }]);
  }, []);

  const FieldValidation = ({ result }: { result: ValidationResult }) => (
    <div className={`flex items-center gap-1 mt-1 text-[10px] ${result.isValid ? 'text-emerald-500' : 'text-rose-500'}`}>
      {result.isValid ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      <span>{result.message || 'Valid'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Organizations */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h3 className="text-sm font-bold">Organizations</h3>
          <Button size="sm"><Plus className="h-4 w-4" /> Add</Button>
        </CardHeader>
        <CardBody className="space-y-2">
          {orgs.map(o => (
            <div key={o.id} className="p-2 border rounded">
              <div className="flex justify-between items-center">
                <span>{o.name} ({o.slug})</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm"><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <FieldValidation result={validateSlug(o.slug)} />
            </div>
          ))}
        </CardBody>
      </Card>
      {/* Branches & Terminals */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h3 className="text-sm font-bold">Terminals</h3>
          <Button size="sm"><Plus className="h-4 w-4" /> Add</Button>
        </CardHeader>
        <CardBody className="space-y-2">
          {terminals.map(t => (
            <div key={t.id} className="p-2 border rounded">
              <div className="flex justify-between items-center">
                <span>{t.name} ({t.code})</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm"><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <FieldValidation result={validateCode(t.code)} />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
};
