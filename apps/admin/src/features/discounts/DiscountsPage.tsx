import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { ADMIN_API, apiRequest, unwrapList } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Category, Collection, Discount, Product } from '../../types/domain';

interface FormState {
  name: string; code: string; description: string; type: Discount['type']; scope: Discount['scope']; value: number;
  minimumOrderAmount: string; maximumDiscountAmount: string; startsAt: string; endsAt: string;
  usageLimit: string; perCustomerLimit: string; productIds: string[]; categoryIds: string[]; collectionIds: string[]; isActive: boolean;
}
const empty: FormState = { name: '', code: '', description: '', type: 'PERCENTAGE', scope: 'ALL_PRODUCTS', value: 10, minimumOrderAmount: '', maximumDiscountAmount: '', startsAt: '', endsAt: '', usageLimit: '', perCustomerLimit: '', productIds: [], categoryIds: [], collectionIds: [], isActive: true };
function localDate(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 16) : ''; }
function iso(value: string) { return value ? new Date(value).toISOString() : null; }
function discountState(discount: Discount) {
  const now = Date.now();
  if (!discount.isActive) return { label: 'Inactive', tone: 'neutral' as const };
  if (discount.startsAt && new Date(discount.startsAt).getTime() > now) return { label: 'Scheduled', tone: 'info' as const };
  if (discount.endsAt && new Date(discount.endsAt).getTime() < now) return { label: 'Expired', tone: 'danger' as const };
  if (discount.usageLimit != null && discount.usageCount >= discount.usageLimit) return { label: 'Used up', tone: 'warning' as const };
  return { label: 'Active', tone: 'success' as const };
}

export function DiscountsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Discount | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Discount | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const discountsQuery = useQuery({ queryKey: ['discounts'], queryFn: async () => unwrapList<Discount>(await apiRequest(ADMIN_API.discounts), ['discounts']) });
  const productsQuery = useQuery({ queryKey: ['products', 'discount-picker'], queryFn: async () => unwrapList<Product>(await apiRequest(`${ADMIN_API.products}?limit=1000`), ['products']) });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: async () => unwrapList<Category>(await apiRequest(ADMIN_API.categories), ['categories']) });
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: async () => unwrapList<Collection>(await apiRequest(ADMIN_API.collections), ['collections']) });

  useEffect(() => {
    if (editing === undefined) return;
    if (!editing) { setForm(empty); return; }
    setForm({
      name: editing.name, code: editing.code, description: editing.description ?? '', type: editing.type, scope: editing.scope,
      value: Number(editing.value), minimumOrderAmount: editing.minimumOrderAmount == null ? '' : String(editing.minimumOrderAmount),
      maximumDiscountAmount: editing.maximumDiscountAmount == null ? '' : String(editing.maximumDiscountAmount),
      startsAt: localDate(editing.startsAt), endsAt: localDate(editing.endsAt), usageLimit: editing.usageLimit == null ? '' : String(editing.usageLimit),
      perCustomerLimit: editing.perCustomerLimit == null ? '' : String(editing.perCustomerLimit), productIds: editing.productIds,
      categoryIds: editing.categoryIds, collectionIds: editing.collectionIds, isActive: editing.isActive,
    });
  }, [editing]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest(editing ? ADMIN_API.discount(editing.id) : ADMIN_API.discounts, { method: editing ? 'PUT' : 'POST', body: {
      ...form, code: form.code.toUpperCase(), minimumOrderAmount: form.minimumOrderAmount === '' ? null : Number(form.minimumOrderAmount),
      maximumDiscountAmount: form.maximumDiscountAmount === '' ? null : Number(form.maximumDiscountAmount), startsAt: iso(form.startsAt), endsAt: iso(form.endsAt),
      usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit), perCustomerLimit: form.perCustomerLimit === '' ? null : Number(form.perCustomerLimit),
    } }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['discounts'] }); setEditing(undefined); },
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => apiRequest(ADMIN_API.discount(id), { method: 'DELETE' }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['discounts'] }); setDeleting(null); } });
  if (discountsQuery.isLoading || productsQuery.isLoading || categoriesQuery.isLoading || collectionsQuery.isLoading) return <LoadingState label="Loading discounts" />;
  const discounts = discountsQuery.data ?? [];
  const targetItems = form.scope === 'PRODUCTS' ? (productsQuery.data ?? []).map((item) => ({ id: item.id, label: item.name })) : form.scope === 'CATEGORIES' ? (categoriesQuery.data ?? []).map((item) => ({ id: item.id, label: item.name })) : form.scope === 'COLLECTIONS' ? (collectionsQuery.data ?? []).map((item) => ({ id: item.id, label: item.name })) : [];
  const targetKey = form.scope === 'PRODUCTS' ? 'productIds' : form.scope === 'CATEGORIES' ? 'categoryIds' : 'collectionIds';
  const selectedTargets = form[targetKey] as string[];

  return <div>
    <PageHeader eyebrow="Promotions" title="Discounts" description="Create coupon codes with date windows, usage limits, minimum orders and product, category or collection targeting." actions={<Button onClick={() => setEditing(null)}><Plus size={17} /> New discount</Button>} />
    <section className="panel">{discounts.length ? <div className="table-wrap"><table><thead><tr><th>Discount</th><th>Offer</th><th>Scope</th><th>Usage</th><th>Schedule</th><th>Status</th><th /></tr></thead><tbody>{discounts.map((discount) => { const state = discountState(discount); return <tr key={discount.id}><td><strong>{discount.name}</strong><span className="discount-code">{discount.code}</span></td><td>{discount.type === 'PERCENTAGE' ? `${Number(discount.value)}% off` : discount.type === 'FIXED_AMOUNT' ? `${formatCurrency(discount.value)} off` : 'Free shipping'}{discount.minimumOrderAmount != null ? <span className="table-subtext">Min. {formatCurrency(discount.minimumOrderAmount)}</span> : null}</td><td>{discount.scope.replace('_', ' ').toLowerCase()}</td><td>{discount.usageCount}{discount.usageLimit != null ? ` / ${discount.usageLimit}` : ''}<span className="table-subtext">{discount.perCustomerLimit ? `${discount.perCustomerLimit} per customer` : 'No customer limit'}</span></td><td>{discount.startsAt ? formatDate(discount.startsAt) : 'Immediately'}<span className="table-subtext">to {discount.endsAt ? formatDate(discount.endsAt) : 'No end date'}</span></td><td><Badge tone={state.tone}>{state.label}</Badge></td><td><div className="row-actions"><button className="icon-button" onClick={() => setEditing(discount)}><Pencil size={16} /></button><button className="icon-button icon-button--danger" onClick={() => setDeleting(discount)}><Trash2 size={16} /></button></div></td></tr>; })}</tbody></table></div> : <EmptyState icon={BadgePercent} title="No discounts yet" description="Create targeted coupon codes or free-shipping promotions." actionLabel="Create discount" onAction={() => setEditing(null)} />}</section>

    <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit discount' : 'Create discount'} description="Discount values are recalculated by the backend during checkout." size="lg"><form className="form-stack" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
      <div className="form-grid"><label className="field"><span>Name</span><input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Welcome offer" /></label><label className="field"><span>Coupon code</span><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="WELCOME10" /></label><label className="field field--wide"><span>Description</span><textarea rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="field"><span>Discount type</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Discount['type'] })}><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount</option><option value="FREE_SHIPPING">Free shipping</option></select></label><label className="field"><span>Value</span><input type="number" min="0" step="0.01" disabled={form.type === 'FREE_SHIPPING'} value={form.type === 'FREE_SHIPPING' ? 0 : form.value} onChange={(event) => setForm({ ...form, value: Number(event.target.value) })} /></label><label className="field"><span>Minimum order</span><input type="number" min="0" value={form.minimumOrderAmount} onChange={(event) => setForm({ ...form, minimumOrderAmount: event.target.value })} /></label><label className="field"><span>Maximum discount</span><input type="number" min="0" disabled={form.type === 'FREE_SHIPPING'} value={form.maximumDiscountAmount} onChange={(event) => setForm({ ...form, maximumDiscountAmount: event.target.value })} /></label><label className="field"><span>Starts</span><input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label><label className="field"><span>Ends</span><input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label><label className="field"><span>Total usage limit</span><input type="number" min="1" value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} /></label><label className="field"><span>Per-customer limit</span><input type="number" min="1" value={form.perCustomerLimit} onChange={(event) => setForm({ ...form, perCustomerLimit: event.target.value })} /></label><label className="field"><span>Applies to</span><select value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value as Discount['scope'] })}><option value="ALL_PRODUCTS">All products</option><option value="PRODUCTS">Selected products</option><option value="CATEGORIES">Selected categories</option><option value="COLLECTIONS">Selected collections</option></select></label><label className="switch-row"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span className="switch" /><div><strong>Active</strong><span>Customers can use this code.</span></div></label></div>
      {form.scope !== 'ALL_PRODUCTS' ? <div className="form-section"><div className="form-section__header"><div><strong>Discount targets</strong><span>{selectedTargets.length} selected</span></div></div><div className="option-check-grid option-check-grid--dense">{targetItems.map((item) => <label className="check-card" key={item.id}><input type="checkbox" checked={selectedTargets.includes(item.id)} onChange={(event) => setForm((current) => ({ ...current, [targetKey]: event.target.checked ? [...selectedTargets, item.id] : selectedTargets.filter((id) => id !== item.id) }))} /><span><strong>{item.label}</strong></span></label>)}</div></div> : null}
      {saveMutation.error ? <div className="form-alert">{saveMutation.error.message}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditing(undefined)}>Cancel</Button><Button type="submit" isLoading={saveMutation.isPending}>{editing ? 'Save discount' : 'Create discount'}</Button></div>
    </form></Modal>
    <ConfirmDialog isOpen={Boolean(deleting)} title="Disable this discount?" description={`${deleting?.code ?? 'This code'} will stop working at checkout. Usage history is retained.`} confirmLabel="Disable discount" isLoading={deleteMutation.isPending} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} />
  </div>;
}
