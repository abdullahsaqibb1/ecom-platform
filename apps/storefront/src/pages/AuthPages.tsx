import { useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/account" replace />;
  return <AuthShell title="Welcome back" subtitle="Sign in to view your orders and account details."><form onSubmit={async (e) => { e.preventDefault(); setError(''); setSubmitting(true); try { await login(email, password); navigate((location.state as { from?: string } | null)?.from ?? '/account'); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); } finally { setSubmitting(false); } }}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>{error && <p className="form-error">{error}</p>}<button className="button dark full" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button></form><p className="auth-switch">New here? <Link to="/register">Create an account</Link></p></AuthShell>;
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/account" replace />;
  return <AuthShell title="Create account" subtitle="Save your details, follow orders and checkout faster."><form onSubmit={async (e) => { e.preventDefault(); setError(''); setSubmitting(true); try { await register(form.name, form.email, form.password); navigate('/account'); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create your account.'); } finally { setSubmitting(false); } }}><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>Password<input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>{error && <p className="form-error">{error}</p>}<button className="button dark full" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button></form><p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p></AuthShell>;
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="auth-page"><div className="auth-visual"><img src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1400&q=88" alt="" /></div><div className="auth-panel"><div><p className="eyebrow">Customer account</p><h1>{title}</h1><p>{subtitle}</p>{children}</div></div></section>;
}
