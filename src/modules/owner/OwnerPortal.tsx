import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getOwnerSupabaseClient } from '../../lib/supabaseOwnerClient';

type PortalState = 'loading' | 'signed-out' | 'authorized' | 'denied' | 'error';

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' },
  card: { width: '100%', maxWidth: 460, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 32, boxShadow: '0 18px 60px rgba(15,23,42,.08)' },
  input: { width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 16, marginTop: 6 },
  button: { width: '100%', padding: '12px 14px', border: 0, borderRadius: 10, background: '#c87935', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 16 },
  muted: { color: '#64748b', lineHeight: 1.6, fontSize: 14 },
};

export const OwnerPortal: React.FC = () => {
  const [state, setState] = useState<PortalState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    let client: ReturnType<typeof getOwnerSupabaseClient>;
    const authorize = async (candidate: User | null) => {
      if (!alive) return;
      setUser(candidate);
      if (!candidate) { setState('signed-out'); return; }
      const { data, error } = await client.from('user_roles').select('role').eq('user_id', candidate.id).maybeSingle();
      if (!alive) return;
      if (error) { setMessage('ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองใหม่'); setState('error'); return; }
      if (data?.role === 'owner' || data?.role === 'admin') { setState('authorized'); setMessage(''); }
      else { setState('denied'); }
    };
    try {
      client = getOwnerSupabaseClient();
      void client.auth.getUser().then(({ data, error }) => {
        if (error) { if (alive) setState('signed-out'); return; }
        return authorize(data.user);
      }).catch(() => { if (alive) { setMessage('ไม่สามารถเชื่อมต่อระบบยืนยันตัวตนได้'); setState('error'); } });
      const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
        void authorize(session?.user ?? null);
      });
      return () => { alive = false; listener.subscription.unsubscribe(); };
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Owner auth configuration error');
      setState('error');
      return () => { alive = false; };
    }
  }, []);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      const client = getOwnerSupabaseClient();
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword('');
    } catch {
      setMessage('เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน หรือสถานะบัญชี');
    } finally { setBusy(false); }
  };

  const signOut = async () => {
    setBusy(true);
    try { await getOwnerSupabaseClient().auth.signOut(); setUser(null); setState('signed-out'); }
    catch { setMessage('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง'); }
    finally { setBusy(false); }
  };

  return <main style={styles.page}><section style={styles.card}>
    <div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 800, color: '#b76e28' }}>PRODX POS · OWNER CONSOLE</div>
    <h1 style={{ fontSize: 28, margin: '12px 0 8px' }}>{state === 'authorized' ? 'Owner Admin' : 'ระบบจัดการ PRODX POS'}</h1>
    <p style={styles.muted}>พื้นที่จัดการแยกจากระบบล็อกอินพนักงานหน้าร้าน</p>
    {state === 'loading' && <p role="status" style={styles.muted}>กำลังตรวจสอบเซสชันและสิทธิ์…</p>}
    {state === 'signed-out' && <form onSubmit={signIn}>
      <label htmlFor="owner-email">อีเมลผู้ดูแลระบบ</label><input id="owner-email" style={styles.input} type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="owner-password" style={{ display: 'block', marginTop: 16 }}>รหัสผ่าน</label><input id="owner-password" style={styles.input} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
      <button style={styles.button} type="submit" disabled={busy}>{busy ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบผู้ดูแล'}</button>
    </form>}
    {state === 'authorized' && <div>
      <p><strong>เข้าสู่ระบบแล้ว</strong></p><p style={styles.muted}>{user?.email}</p>
      <p style={styles.muted}>ยืนยันสิทธิ์จากตาราง user_roles แล้ว หน้าจัดการเพิ่มเติมจะเปิดใช้งานหลังเชื่อมต่อโมดูลผู้ดูแล</p>
      <button style={styles.button} onClick={() => void signOut()} disabled={busy}>ออกจากระบบ</button>
    </div>}
    {state === 'denied' && <div role="alert"><p><strong>บัญชีนี้ไม่มีสิทธิ์ Owner/Admin</strong></p><p style={styles.muted}>ระบบไม่อนุญาตให้เข้าถึงส่วนจัดการ กรุณาติดต่อเจ้าของระบบ</p><button style={styles.button} onClick={() => void signOut()} disabled={busy}>ออกจากระบบ</button></div>}
    {state === 'error' && <div role="alert"><p style={{ color: '#b91c1c' }}>{message || 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'}</p><button style={styles.button} onClick={() => window.location.reload()}>ลองใหม่</button></div>}
    {message && state !== 'error' && <p role="alert" style={{ color: '#b91c1c', fontSize: 14 }}>{message}</p>}
    <p style={{ ...styles.muted, marginTop: 24 }}>ความปลอดภัย: สิทธิ์อ่านจากฐานข้อมูล ไม่ใช้ role ที่ส่งมาจาก browser</p>
  </section></main>;
};
