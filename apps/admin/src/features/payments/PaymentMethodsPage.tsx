import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../auth/AuthContext';
import { ADMIN_API, apiRequest, unwrapList } from '../../lib/api';
import type { PaymentMethod } from '../../types/domain';

interface FormState {
  code: string; provider: string; displayName: string; description: string; instructions: string;
  isEnabled: boolean; requiresOnlinePayment: boolean; sortOrder: number;
}
const empty: FormState = { code: '', provider: 'manual', displayName: '', description: '', instructions: '', isEnabled: false, requiresOnlinePayment: false, sortOrder: 50 };

export function PaymentMethodsPage() {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PaymentMethod | null | undefined>(undefined);
  const [form, setForm] = useState<FormState>(empty);
  const query = useQuery({ queryKey: ['payment-methods'], queryFn: async () => unwrapList<PaymentMethod>(await apiRequest(ADMIN_API.paymentMethods), ['paymentMethods']) });
  useEffect(() => {
    if (editing === undefined) return;
    if (!editing) { setForm(empty); return; }
    setForm({ code: editing.code, provider: editing.provider, displayName: editing.displayName, description: editing.description ?? '', instructions: editing.instructions ?? '', isEnabled: editing.isEnabled, requiresOnlinePayment: editing.requiresOnlinePayment, sortOrder: editing.sortOrder });
  }, [editing]);
  const saveMutation = useMutation({
    mutationFn: () => apiRequest(editing ? ADMIN_API.paymentMethod(editing.id) : ADMIN_API.paymentMethods, { method: editing ? 'PUT' : 'POST', body: editing ? { displayName: form.displayName, provider: form.provider, description: form.description || null, instructions: form.instructions || null, isEnabled: form.isEnabled, requiresOnlinePayment: form.requiresOnlinePayment, sortOrder: form.sortOrder, configuration: {} } : { ...form, code: form.code.toLowerCase(), description: form.description || null, instructions: form.instructions || null, configuration: {} } }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['payment-methods'] }); setEditing(undefined); },
  });
  const toggleMutation = useMutation({
    mutationFn: ({ method, enabled }: { method: PaymentMethod; enabled: boolean }) => apiRequest(ADMIN_API.paymentMethod(method.id), { method: 'PATCH', body: { isEnabled: enabled } }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['payment-methods'] }); },
  });
  if (query.isLoading) return <LoadingState label="Loading payment methods" />;
  const methods = query.data ?? [];
  const superadmin = admin?.role === 'SUPERADMIN';
  return <div>
    <PageHeader eyebrow="Checkout operations" title="Payment methods" description="Control which payment choices customers see, their order, labels and instructions. Provider API secrets remain protected in Vercel environment variables." actions={superadmin ? <Button onClick={() => setEditing(null)}><Plus size={17} /> Add manual method</Button> : undefined} />
    <div className="security-note"><ShieldCheck size={20} /><div><strong>Secrets are not editable here</strong><span>Safepay API keys, webhook secrets and bank credentials should never be returned to a browser. This panel manages safe operational settings only.</span></div></div>
    <section className="payment-method-grid">{methods.map((method) => <article className="payment-method-card" key={method.id}><div className="payment-method-card__top"><span className="payment-method-icon"><CreditCard size={21} /></span><div><strong>{method.displayName}</strong><span>{method.code} · {method.provider}</span></div><div className="payment-method-badges"><Badge tone={method.isEnabled ? 'success' : 'neutral'}>{method.isEnabled ? 'Enabled' : 'Disabled'}</Badge><Badge tone={method.environmentReady === false ? 'warning' : 'success'}>{method.environmentReady === false ? 'Provider setup needed' : 'Provider ready'}</Badge></div></div><p>{method.description || 'No checkout description.'}</p>{method.instructions ? <div className="payment-instructions"><small>Customer instructions</small><span>{method.instructions}</span></div> : null}<div className="payment-method-card__meta"><span>{method.requiresOnlinePayment ? 'Online confirmation required' : 'Manual / offline confirmation'}</span><span>Position {method.sortOrder}</span></div><div className="payment-method-card__actions"><label className="switch-row switch-row--compact"><input type="checkbox" checked={method.isEnabled} disabled={!superadmin || toggleMutation.isPending} onChange={(event) => toggleMutation.mutate({ method, enabled: event.target.checked })} /><span className="switch" /><div><strong>{method.isEnabled ? 'Available at checkout' : 'Hidden from checkout'}</strong></div></label>{superadmin ? <Button size="sm" variant="secondary" onClick={() => setEditing(method)}>Edit settings</Button> : null}</div></article>)}</section>
    <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit payment method' : 'Add payment method'} description="Use custom methods for cash on delivery, bank transfer or store-specific offline payment instructions." size="md"><form className="form-stack" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}><div className="form-grid"><label className="field"><span>Checkout name</span><input required minLength={2} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label><label className="field"><span>Code</span><input required disabled={Boolean(editing)} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} placeholder="bank-transfer" /></label><label className="field"><span>Provider</span><select value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })}><option value="manual">Manual</option><option value="bank_transfer">Bank transfer</option><option value="safepay">Safepay</option></select></label><label className="field"><span>Sort order</span><input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} /></label><label className="field field--wide"><span>Description</span><textarea rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="field field--wide"><span>Customer instructions</span><textarea rows={5} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Instructions shown after the customer selects this method." /></label><label className="switch-row"><input type="checkbox" checked={form.isEnabled} onChange={(event) => setForm({ ...form, isEnabled: event.target.checked })} /><span className="switch" /><div><strong>Enabled</strong><span>Show at checkout.</span></div></label><label className="switch-row"><input type="checkbox" checked={form.requiresOnlinePayment} onChange={(event) => setForm({ ...form, requiresOnlinePayment: event.target.checked })} /><span className="switch" /><div><strong>Online confirmation</strong><span>Requires a verified provider callback.</span></div></label></div>{saveMutation.error ? <div className="form-alert">{saveMutation.error.message}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditing(undefined)}>Cancel</Button><Button type="submit" isLoading={saveMutation.isPending}>Save method</Button></div></form></Modal>
  </div>;
}
