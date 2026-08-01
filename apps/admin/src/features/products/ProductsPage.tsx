import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { ADMIN_API, apiRequest, unwrapList } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import type { Category, Product } from '../../types/domain';
import { ProductForm, type ProductFormValues } from './ProductForm';

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: async () => unwrapList<Product>(await apiRequest(ADMIN_API.products), ['products']) });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: async () => unwrapList<Category>(await apiRequest(ADMIN_API.categories), ['categories']) });
  const saveMutation = useMutation({
    mutationFn: ({ values, product }: { values: ProductFormValues; product?: Product | null }) => apiRequest(product ? ADMIN_API.product(product.id) : ADMIN_API.products, {
      method: product ? 'PUT' : 'POST',
      body: { ...values, categoryId: values.categoryId || null, images: values.images.map((image) => image.url).filter(Boolean), variants: values.variants.map((variant) => ({ ...variant, size: variant.size || null, color: variant.color || null, image: variant.image || null, price: variant.price ?? null })) },
    }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['products'] }); setEditing(undefined); },
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => apiRequest(ADMIN_API.product(id), { method: 'DELETE' }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['products'] }); setDeleting(null); } });
  if (productsQuery.isLoading || categoriesQuery.isLoading) return <LoadingState label="Loading products" />;
  const products = (productsQuery.data ?? []).filter((product) => product.name.toLowerCase().includes(search.toLowerCase()) || product.category?.name?.toLowerCase().includes(search.toLowerCase()));
  return <div>
    <PageHeader eyebrow="Catalog" title="Products" description="Create, edit, price, stock, and deactivate storefront listings." actions={<Button onClick={() => setEditing(null)}><Plus size={17} /> New product</Button>} />
    <section className="panel">
      <div className="toolbar"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products or categories" /></label><span>{products.length} listings</span></div>
      {products.length ? <div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Inventory</th><th>Status</th><th /></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><div className="product-cell"><span className="product-thumb">{product.images?.[0] ? <img src={product.images[0]} alt="" /> : product.name[0]}</span><div><strong>{product.name}</strong><span>{product.description.slice(0, 58)}{product.description.length > 58 ? '…' : ''}</span></div></div></td><td>{product.category?.name ?? 'Uncategorized'}</td><td><strong>{formatCurrency(product.price)}</strong></td><td><Badge tone={product.stock <= 5 ? 'danger' : product.stock <= 10 ? 'warning' : 'neutral'}>{product.stock} in stock</Badge></td><td><Badge tone={product.isActive ? 'success' : 'neutral'}>{product.isActive ? 'Active' : 'Inactive'}</Badge></td><td><div className="row-actions"><button className="icon-button" onClick={() => setEditing(product)} title="Edit"><Pencil size={16} /></button><button className="icon-button icon-button--danger" onClick={() => setDeleting(product)} title="Deactivate"><Trash2 size={16} /></button><MoreHorizontal size={16} /></div></td></tr>)}</tbody></table></div> : <EmptyState icon={Boxes} title="No products found" description="Create the first listing or adjust your search." actionLabel="Create product" onAction={() => setEditing(null)} />}
    </section>
    <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit product' : 'Create product'} description="All writes are validated by the API before being persisted." size="lg"><ProductForm product={editing} categories={categoriesQuery.data ?? []} isSubmitting={saveMutation.isPending} onCancel={() => setEditing(undefined)} onSubmit={async (values) => { await saveMutation.mutateAsync({ values, product: editing }); }} />{saveMutation.error ? <div className="form-alert">{saveMutation.error.message}</div> : null}</Modal>
    <ConfirmDialog isOpen={Boolean(deleting)} title="Deactivate this product?" description={`${deleting?.name ?? 'This listing'} will no longer be available to customers. Existing order records remain unchanged.`} confirmLabel="Deactivate product" isLoading={deleteMutation.isPending} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} />
  </div>;
}
