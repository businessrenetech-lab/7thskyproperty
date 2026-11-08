import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Field, Input, KV } from '../ui/kit';
import { initialsOf, roleLabel } from '../ui/ShellParts';

const EMPTY = { current: '', next: '', confirm: '' };

export default function MyAccount() {
  const { user } = useAuth();
  const toast = useToast();
  const [pw, setPw] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => { setPw((p) => ({ ...p, [k]: e.target.value })); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (pw.next.length < 8) return setError('Choose a password of at least 8 characters.');
    if (pw.next !== pw.confirm) return setError('The new passwords do not match.');
    setSaving(true);
    try {
      await api.post('/auth/change-password', { current_password: pw.current, new_password: pw.next });
      setPw(EMPTY);
      toast.success('Password changed');
    } catch (err) {
      setError(err?.response?.data?.error || 'The password could not be changed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-2" style={{ alignItems: 'start', maxWidth: 1000 }}>
      <section className="card">
        <div className="card-pad" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 20 }}>
          <span className="ss-avatar is-lg" aria-hidden="true">{initialsOf(user?.name)}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user?.email}</div>
          </div>
        </div>
        <div style={{ padding: '0 20px 12px' }}>
          <KV k="Role" v={roleLabel(user?.role)} />
          <KV k="Branch" v={user?.Branch?.name} />
          <KV k="Status" v={roleLabel(user?.status)} />
        </div>
        <p style={{ margin: 0, padding: '0 20px 20px', fontSize: 12.5, color: 'var(--muted)' }}>
          To change your name, email or role, ask an administrator in Users &amp; roles.
        </p>
      </section>

      <section className="card">
        <div className="card-head"><h3>Change password</h3></div>
        <form onSubmit={submit} style={{ padding: 20, display: 'grid', gap: 14 }}>
          <Field label="Current password" required>
            <Input type="password" autoComplete="current-password" value={pw.current} onChange={set('current')} required />
          </Field>
          <Field label="New password" required>
            <Input type="password" autoComplete="new-password" value={pw.next} onChange={set('next')} minLength={8} required />
          </Field>
          <Field label="Repeat new password" required>
            <Input type="password" autoComplete="new-password" value={pw.confirm} onChange={set('confirm')} required />
          </Field>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>At least 8 characters.</div>
          {error && <div role="alert" style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{error}</div>}
          <div>
            <Button type="submit" icon={KeyRound} disabled={saving}>{saving ? 'Changing…' : 'Change password'}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
