import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { useAuth } from './AuthContext';

const schema = z.object({
  email: z.string().email('Enter a valid admin email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = async (values: FormValues) => {
    setApiError('');
    try {
      await login(values);
      const from = (location.state as { from?: string } | null)?.from || '/';
      navigate(from, { replace: true });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Sign-in failed.');
    }
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-story__brand"><span className="brand-mark"><ShieldCheck size={22} /></span><strong>Commerce Admin</strong></div>
        <div className="login-story__content">
          <span className="security-kicker"><LockKeyhole size={16} /> Separate administrative identity</span>
          <h1>Manage the store without crossing the customer security boundary.</h1>
          <p>This application accepts only admin credentials and communicates exclusively with protected admin API routes.</p>
          <div className="login-proof-grid">
            <div><strong>Separate JWT</strong><span>Dedicated admin signing secret</span></div>
            <div><strong>Separate storage</strong><span>Isolated browser session key</span></div>
            <div><strong>Separate origin</strong><span>Deploy independently from storefront</span></div>
          </div>
        </div>
        <small>Restricted system · Authorized personnel only</small>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="login-card__header"><span>Administrator access</span><h2>Welcome back</h2><p>Sign in with an account created by a superadmin.</p></div>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {apiError ? <div className="form-alert">{apiError}</div> : null}
            <label className="field"><span>Email address</span><input type="email" autoComplete="username" placeholder="admin@store.com" {...register('email')} />{errors.email ? <small>{errors.email.message}</small> : null}</label>
            <label className="field"><span>Password</span><input type="password" autoComplete="current-password" placeholder="Enter your password" {...register('password')} />{errors.password ? <small>{errors.password.message}</small> : null}</label>
            <Button type="submit" isLoading={isSubmitting} className="button--full">Sign in securely <ArrowRight size={17} /></Button>
          </form>
          <div className="login-card__note"><ShieldCheck size={17} /><span>Customer accounts cannot authenticate here.</span></div>
        </div>
      </section>
    </main>
  );
}
