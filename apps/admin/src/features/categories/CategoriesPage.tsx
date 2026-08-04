import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { ADMIN_API, apiRequest, unwrapList } from '../../lib/api';
import type { Category } from '../../types/domain';

interface FormState { name: string; description: string; image: string; parentId: string; sortOrder: number; isActive: boolean }
const empty: FormState = { name: '', description: '', image: '', parentId: '', sortOrder: 0, isActive: true };

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const query = useQuery({ queryKey: ['categories'], queryFn: async () => unwrapList<Category>(await apiRequest(ADMIN_API.categories), ['categories']) });
  useEffect(() => {
    if (editing === undefined) return;
    if (!editing) { setForm(empty); return; }
    setForm({ name: editing.name, description: editing.description ?? '', image: editing.image ?? '', parentId: editing.parentId ?? '', sortOrder: editing.sortOrder ?? 0, isActive: editing.isActive ?? true });
  }, [editing]);
  const saveMutation = useMutation({ mutationFn: () => apiRequest(editing ? ADMIN_API.category(editing.id) : ADMIN_API.categories, { method: editing ? 'PUT' : 'POST', body: { ...form, image: form.image || null, parentId: form.parentId || null } }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['categories'] }); setEditing(undefined); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => apiRequest(ADMIN_API.category(id), { method: 'DELETE' }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['categories'] }); setDeleting(null); } });
  if (query.isLoading) return <LoadingState label="Loading categories" />;
  const categories = query.data ?? [];
  return <div>
    <PageHeader eyebrow="Catalog structure" title="Categories" description="Define the permanent technology taxonomy customers browse, with optional parent categories, descriptions and imagery." actions={<Button onClick={() => setEditing(null)}><Plus size={17} /> New category</Button>} />
    <section className="panel">{categories.length ? <div className="category-grid">{categories.map((category) => <article className="category-card category-card--rich" key={category.id}><div className="category-card__image">{category.image ? <img src={category.image} alt="" /> : <FolderTree size={20} />}</div><div><strong>{category.name}</strong><span>{category.parent?.name ? `Under ${category.parent.name}` : category.slug ?? 'Automatic slug'}</span><p>{category.description || 'No category description.'}</p></div><div className="category-card__meta"><span>{category.productCount ?? 0} products</span><Badge tone={category.isActive === false ? 'neutral' : 'success'}>{category.isActive === false ? 'Hidden' : 'Active'}</Badge></div><div className="row-actions"><button className="icon-button" onClick={() => setEditing(category)}><Pencil size={16} /></button><button className="icon-button icon-button--danger" onClick={() => setDeleting(category)}><Trash2 size={16} /></button></div></article>)}</div> : <EmptyState icon={FolderTree} title="No categories yet" description="Create categories such as Audio, Chargers, Cables, Power Banks and Accessories." actionLabel="Create category" onAction={() => setEditing(null)} />}</section>
    <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit category' : 'Create category'} description="Categories describe what a product is; use Collections for campaigns and curated groups." size="md"><form className="form-stack" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}><div className="form-grid"><label className="field field--wide"><span>Name</span><input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Chargers" /></label><label className="field field--wide"><span>Description</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="field field--wide"><span>Image URL</span><input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></label><label className="field"><span>Parent category</span><select value={form.parentId} onChange={(event) => setForm({ ...form, parentId: event.target.value })}><option value="">No parent</option>{categories.filter((category) => category.id !== editing?.id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="field"><span>Sort order</span><input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} /></label><label className="switch-row"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span className="switch" /><div><strong>Active</strong><span>Visible in storefront navigation.</span></div></label></div>{saveMutation.error ? <div className="form-alert">{saveMutation.error.message}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditing(undefined)}>Cancel</Button><Button type="submit" isLoading={saveMutation.isPending}>{editing ? 'Save category' : 'Create category'}</Button></div></form></Modal>
    <ConfirmDialog isOpen={Boolean(deleting)} title="Delete this category?" description="Assigned products become uncategorized. Child categories are moved to the top level." confirmLabel="Delete category" isLoading={deleteMutation.isPending} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} />
  </div>;
}
