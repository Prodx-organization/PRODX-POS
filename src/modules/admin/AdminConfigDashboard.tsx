import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Building2, CheckCircle2, Monitor, Plus, Store, Trash2 } from 'lucide-react';
import {
  createBranch,
  createOrganization,
  createTerminal,
  deleteBranch,
  deleteOrganization,
  deleteTerminal,
  getBranches,
  getOrganizations,
  getTerminals,
} from '../../services/systemConfigService';
import { Organization, Branch, Terminal } from '../settings/types';
import { AdminConsoleSection } from './AdminConsoleLayout';
import { useToast } from '../../context/ToastContext';

export interface AdminConfigDashboardProps {
  activeSection?: AdminConsoleSection;
}

export const AdminConfigDashboard: React.FC<AdminConfigDashboardProps> = ({
  activeSection = 'overview',
}) => {
  const { addToast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [terminals, setTerminals] = useState<Terminal[]>([]);

  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newTerminalName, setNewTerminalName] = useState('');
  const [newTerminalCode, setNewTerminalCode] = useState('');

  useEffect(() => {
    const fetchOrgs = async () => {
      const o = await getOrganizations();
      setOrgs(o);
      if (o.length > 0) setSelectedOrgId(o[0].id);
    };
    void fetchOrgs();
  }, []);

  useEffect(() => {
    if (!selectedOrgId) {
      setBranches([]);
      setSelectedBranchId('');
      return;
    }
    const fetchBr = async () => {
      const b = await getBranches(selectedOrgId);
      setBranches(b);
      setSelectedBranchId(b[0]?.id ?? '');
    };
    void fetchBr();
  }, [selectedOrgId]);

  useEffect(() => {
    if (!selectedBranchId) {
      setTerminals([]);
      return;
    }
    const fetchTerm = async () => {
      const t = await getTerminals(selectedBranchId);
      setTerminals(t);
    };
    void fetchTerm();
  }, [selectedBranchId]);

  const handleAddOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOrgSlug.trim()) return;
    try {
      const created = await createOrganization({ name: newOrgName, slug: newOrgSlug });
      setOrgs((prev) => [...prev, created]);
      setSelectedOrgId(created.id);
      setNewOrgName('');
      setNewOrgSlug('');
      addToast({
        title: 'Organization Created',
        message: `${created.name} (${created.slug}) saved to Firestore.`,
        type: 'success',
      });
    } catch {
      addToast({
        title: 'Error',
        message: 'Could not create organization.',
        type: 'error',
      });
    }
  };

  const handleDeleteOrg = async (id: string) => {
    try {
      await deleteOrganization(id);
      setOrgs((prev) => prev.filter((o) => o.id !== id));
      if (selectedOrgId === id) {
        setSelectedOrgId('');
      }
      addToast({
        title: 'Organization Removed',
        message: 'Organization deleted from Firestore.',
        type: 'info',
      });
    } catch {
      addToast({
        title: 'Error',
        message: 'Failed to delete organization.',
        type: 'error',
      });
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !newBranchName.trim()) return;
    try {
      const created = await createBranch({
        orgId: selectedOrgId,
        name: newBranchName,
        address: newBranchAddress,
      });
      setBranches((prev) => [...prev, created]);
      setSelectedBranchId(created.id);
      setNewBranchName('');
      setNewBranchAddress('');
      addToast({
        title: 'Branch Created',
        message: `Branch ${created.name} added.`,
        type: 'success',
      });
    } catch {
      addToast({
        title: 'Error',
        message: 'Could not create branch.',
        type: 'error',
      });
    }
  };

  const handleDeleteBranch = async (id: string) => {
    try {
      await deleteBranch(id);
      setBranches((prev) => prev.filter((b) => b.id !== id));
      if (selectedBranchId === id) {
        setSelectedBranchId('');
      }
      addToast({
        title: 'Branch Removed',
        message: 'Branch deleted from Firestore.',
        type: 'info',
      });
    } catch {
      addToast({
        title: 'Error',
        message: 'Failed to delete branch.',
        type: 'error',
      });
    }
  };

  const handleAddTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId || !newTerminalName.trim() || !newTerminalCode.trim()) return;
    try {
      const created = await createTerminal({
        branchId: selectedBranchId,
        name: newTerminalName,
        code: newTerminalCode,
      });
      setTerminals((prev) => [...prev, created]);
      setNewTerminalName('');
      setNewTerminalCode('');
      addToast({
        title: 'Terminal Created',
        message: `Terminal ${created.code} added.`,
        type: 'success',
      });
    } catch {
      addToast({
        title: 'Error',
        message: 'Could not create terminal.',
        type: 'error',
      });
    }
  };

  const handleDeleteTerminal = async (id: string) => {
    try {
      await deleteTerminal(id);
      setTerminals((prev) => prev.filter((t) => t.id !== id));
      addToast({
        title: 'Terminal Removed',
        message: 'Terminal deleted from Firestore.',
        type: 'info',
      });
    } catch {
      addToast({
        title: 'Error',
        message: 'Failed to delete terminal.',
        type: 'error',
      });
    }
  };

  const showOrgs = activeSection === 'overview' || activeSection === 'organizations';
  const showBranches = activeSection === 'overview' || activeSection === 'branches';
  const showTerminals = activeSection === 'overview' || activeSection === 'terminals';

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Summary Header Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Organizations
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{orgs.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Active: <span className="font-bold text-slate-700">{selectedOrg?.name || 'None'}</span>
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Branches (Selected Org)
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{branches.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Active:{' '}
              <span className="font-bold text-slate-700">{selectedBranch?.name || 'None'}</span>
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Store className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              POS Terminals (Selected Branch)
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{terminals.length}</div>
            <div className="text-xs text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Synced with Firestore
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Monitor className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Entity Management Panels */}
      <div
        className={`grid gap-6 ${
          activeSection === 'overview' ? 'lg:grid-cols-3' : 'grid-cols-1 max-w-3xl'
        }`}
      >
        {showOrgs && (
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Organizations
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <form onSubmit={handleAddOrg} className="space-y-2">
                <input
                  type="text"
                  placeholder="Organization Name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="slug (e.g. prodx)"
                    value={newOrgSlug}
                    onChange={(e) => setNewOrgSlug(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900"
                  />
                  <Button type="submit" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              <div className="space-y-2">
                {orgs.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrgId(o.id)}
                    className={`p-3 border rounded-lg flex justify-between items-center cursor-pointer transition-colors ${
                      selectedOrgId === o.id
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">
                      {o.name} <span className="text-slate-400">({o.slug})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteOrg(o.id);
                      }}
                      className="text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {showBranches && (
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" /> Store Branches
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              {activeSection !== 'overview' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Parent Organization</label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-bold"
                  >
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <form onSubmit={handleAddBranch} className="space-y-2">
                <input
                  type="text"
                  placeholder="Branch Code (e.g. STR-01)"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  disabled={!selectedOrgId}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Address"
                    value={newBranchAddress}
                    onChange={(e) => setNewBranchAddress(e.target.value)}
                    disabled={!selectedOrgId}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900"
                  />
                  <Button type="submit" size="sm" disabled={!selectedOrgId}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              <div className="space-y-2">
                {branches.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBranchId(b.id)}
                    className={`p-3 border rounded-lg flex justify-between items-center cursor-pointer transition-colors ${
                      selectedBranchId === b.id
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{b.name}</div>
                      <div className="text-[11px] text-slate-400">{b.address}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteBranch(b.id);
                      }}
                      className="text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {showTerminals && (
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" /> POS Terminals
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              {activeSection !== 'overview' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500">Organization</label>
                    <select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-bold"
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500">Branch</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-bold"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <form onSubmit={handleAddTerminal} className="space-y-2">
                <input
                  type="text"
                  placeholder="Terminal Name"
                  value={newTerminalName}
                  onChange={(e) => setNewTerminalName(e.target.value)}
                  disabled={!selectedBranchId}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Code (e.g. Terminal-001)"
                    value={newTerminalCode}
                    onChange={(e) => setNewTerminalCode(e.target.value)}
                    disabled={!selectedBranchId}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900"
                  />
                  <Button type="submit" size="sm" disabled={!selectedBranchId}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              <div className="space-y-2">
                {terminals.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 border border-slate-200 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{t.code}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDeleteTerminal(t.id)}
                      className="text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};
