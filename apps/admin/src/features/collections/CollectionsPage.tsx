import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers3, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { ADMIN_API, apiRequest, unwrapList } from '../../lib/api';
import type { Collection, Product } from '../../types/domain';

interface FormState {
  name: string; description: string; image: string; isActive: boolean; isFeatured: boolean; sortOrder: number; productIds: string[];
}
const empty: FormState = { name: '', description: '', image: '', isActive: true, isFeatured: false, sortOrder: 0, productIds: [] };

export function CollectionsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Collection | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Collection | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [productSearch, setProductSearch] = useState('');
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: async () => unwrapList<Collection>(await apiRequest(ADMIN_API.collections), ['collections']) });
  const productsQuery = useQuery({ queryKey: ['products', 'collection-picker'], queryFn: async () => unwrapList<Product>(await apiRequest(`${ADMIN_API.products}?limit=1000`), ['products']) });
  const products = productsQuery.data ?? [];
  const filteredProducts = useMemo(() => products.filter((product) => [product.name, product.brand, product.model].filter(Boolean).join(' ').toLowerCase().includes(productSearch.toLowerCase())), [products, productSearch]);

  useEffect(() => {
    if (editing === undefined) return;
    if (!editing) { setForm(empty); return; }
    setForm({
      name: editing.name, description: editing.description ?? '', image: editing.image ?? '',
      isActive: editing.isActive, isFeatured: editing.isFeatured, sortOrder: editing.sortOrder,
      productIds: products.filter((product) => product.collections?.some((item) => item.collectionId === editing.id)).map((product) => product.id),
    });
  }, [editing, products]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest(editing ? ADMIN_API.collection(editing.id) : ADMIN_API.collections, {
      method: editing ? 'PUT' : 'POST', body: { ...form, image: form.image.trim() || null },
    }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['collections'] }), queryClient.invalidateQueries({ queryKey: ['products'] })]); setEditing(undefined); },
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => apiRequest(ADMIN_API.collection(id), { method: 'DELETE' }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['collections'] }); setDeleting(null); } });

  if (collectionsQuery.isLoading || productsQuery.isLoading) return <LoadingState label="Loading collections" />;
  const collections = collectionsQuery.data ?? [];
  return <div>
    <PageHeader eyebrow="Merchandising" title="Collections" description="Build curated storefront groups independently from product categories—such as Fast Charging, iPhone Essentials, New Arrivals or Best Sellers." actions={<Button onClick={() => setEditing(null)}><Plus size={17} /> New collection</Button>} />
    <section className="panel">{collections.length ? <div className="collection-grid">{collections.map((collection) => <article className="collection-card" key={collection.id}><div className="collection-card__image">{collection.image ? <img src={collection.image} alt="" /> : <Layers3 size={28} />}</div><div className="collection-card__body"><div className="collection-card__title"><div><strong>{collection.name}</strong><span>/{collection.slug}</span></div><Badge tone={collection.isActive ? 'success' : 'neutral'}>{collection.isActive ? 'Active' : 'Hidden'}</Badge></div><p>{collection.description || 'No collection description yet.'}</p><div className="collection-card__meta"><span>{collection.productCount ?? 0} products</span>{collection.isFeatured ? <Badge tone="purple">Featured</Badge> : null}</div><div className="row-actions"><Button size="sm" variant="secondary" onClick={() => setEditing(collection)}><Pencil size={15} /> Edit</Button><button className="icon-button icon-button--danger" onClick={() => setDeleting(collection)}><Trash2 size={16} /></button></div></div></article>)}</div> : <EmptyState icon={Layers3} title="No collections yet" description="Create merchandising groups for homepage edits, campaigns and customer discovery." actionLabel="Create collection" onAction={() => setEditing(null)} />}</section>

    <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit collection' : 'Create collection'} description="A product can belong to multiple collections." size="lg">
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
        <div className="form-grid"><label className="field field--wide"><span>Name</span><input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Fast Charging" /></label><label className="field field--wide"><span>Description</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="field field--wide"><span>Cover image URL</span><input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></label><label className="field"><span>Sort order</span><input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} /></label><label className="switch-row"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span className="switch" /><div><strong>Active</strong><span>Visible on the storefront.</span></div></label><label className="switch-row"><input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} /><span className="switch" /><div><strong>Featured</strong><span>Eligible for homepage placement.</span></div></label></div>
        <div className="form-section"><div className="form-section__header"><div><strong>Products</strong><span>{form.productIds.length} selected</span></div><label className="search-box search-box--compact"><Search size={16} /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search products" /></label></div><div className="product-picker">{filteredProducts.map((product) => <label className="product-picker__item" key={product.id}><input type="checkbox" checked={form.productIds.includes(product.id)} onChange={(event) => setForm((current) => ({ ...current, productIds: event.target.checked ? [...current.productIds, product.id] : current.productIds.filter((id) => id !== product.id) }))} /><span className="product-thumb">{product.images?.[0] ? <img src={product.images[0]} alt="" /> : product.name[0]}</span><span><strong>{product.name}</strong><small>{product.category?.name ?? 'Uncategorized'}</small></span></label>)}</div></div>
        {saveMutation.error ? <div className="form-alert">{saveMutation.error.message}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditing(undefined)}>Cancel</Button><Button type="submit" isLoading={saveMutation.isPending}>{editing ? 'Save collection' : 'Create collection'}</Button></div>
      </form>
    </Modal>
    <ConfirmDialog isOpen={Boolean(deleting)} title="Delete this collection?" description="Products remain in the catalog; only this merchandising group is removed." confirmLabel="Delete collection" isLoading={deleteMutation.isPending} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} />
  </div>;
}
