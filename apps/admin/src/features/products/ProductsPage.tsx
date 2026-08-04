import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Boxes, Pencil, Plus, Search } from 'lucide-react';
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
import type { Category, Collection, Product } from '../../types/domain';
import { useAuth } from '../auth/AuthContext';
import { ProductForm, type ProductFormValues } from './ProductForm';

function splitValues(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}
function specificationsFromRows(rows: ProductFormValues['specifications']) {
  return Object.fromEntries(rows.map((row) => [row.key.trim(), row.value.trim()]).filter(([key, value]) => key && value));
}
function specificationsFromText(value: string) {
  return Object.fromEntries(value.split('\n').map((line) => {
    const [key, ...rest] = line.split(':');
    return [key?.trim() ?? '', rest.join(':').trim()];
  }).filter(([key, value]) => key && value));
}
function statusTone(status?: Product['status']) {
  if (status === 'ACTIVE') return 'success' as const;
  if (status === 'DRAFT') return 'warning' as const;
  return 'neutral' as const;
}

export function ProductsPage() {
  const queryClient = useQueryClient();
  const { admin } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('ARCHIVE');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkCollection, setBulkCollection] = useState('');
  const [bulkThreshold, setBulkThreshold] = useState(5);

  const productsQuery = useQuery({ queryKey: ['products'], queryFn: async () => unwrapList<Product>(await apiRequest(`${ADMIN_API.products}?limit=1000`), ['products']) });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: async () => unwrapList<Category>(await apiRequest(ADMIN_API.categories), ['categories']) });
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: async () => unwrapList<Collection>(await apiRequest(ADMIN_API.collections), ['collections']) });

  const saveMutation = useMutation({
    mutationFn: ({ values, product }: { values: ProductFormValues; product?: Product | null }) => apiRequest(product ? ADMIN_API.product(product.id) : ADMIN_API.products, {
      method: product ? 'PUT' : 'POST',
      body: {
        name: values.name.trim(), brand: values.brand?.trim() || null, model: values.model?.trim() || null,
        barcode: values.barcode?.trim() || null, condition: values.condition || 'NEW', warrantyMonths: values.warrantyMonths ?? null,
        description: values.description.trim(), price: values.price, compareAtPrice: values.compareAtPrice ?? null,
        costPrice: values.costPrice ?? null, stock: values.stock, lowStockThreshold: values.lowStockThreshold,
        categoryId: values.categoryId || null, collectionIds: values.collectionIds,
        status: values.status, isActive: values.status === 'ACTIVE', isFeatured: values.isFeatured,
        compatibility: splitValues(values.compatibilityText), highlights: splitValues(values.highlightsText),
        whatsInBox: splitValues(values.whatsInBoxText), tags: splitValues(values.tagsText).map((tag) => tag.toLowerCase()),
        specifications: specificationsFromRows(values.specifications), seoTitle: values.seoTitle?.trim() || null,
        seoDescription: values.seoDescription?.trim() || null,
        images: values.images.map((image) => image.url.trim()).filter(Boolean),
        color: null, material: null, careInstructions: [],
        variants: values.variants.map((variant) => ({
          ...(variant.id ? { id: variant.id } : {}), sku: variant.sku.trim(), size: variant.size?.trim() || null,
          color: variant.color?.trim() || null, barcode: variant.barcode?.trim() || null,
          price: variant.price ?? null, costPrice: variant.costPrice ?? null, stock: variant.stock,
          lowStockThreshold: variant.lowStockThreshold, compatibility: splitValues(variant.compatibilityText), specifications: specificationsFromText(variant.specificationsText),
          image: variant.image?.trim() || null,
        })),
      },
    }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['products'] }), queryClient.invalidateQueries({ queryKey: ['inventory'] })]); setEditing(undefined); },
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => apiRequest(ADMIN_API.product(id), { method: 'DELETE' }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['products'] }); setDeleting(null); } });
  const bulkMutation = useMutation({
    mutationFn: () => apiRequest(ADMIN_API.productBulk, {
      method: 'POST',
      body: {
        productIds: Array.from(selected), action: bulkAction,
        ...(bulkAction === 'MOVE_CATEGORY' ? { categoryId: bulkCategory || null } : {}),
        ...(['ADD_COLLECTION', 'REMOVE_COLLECTION'].includes(bulkAction) ? { collectionId: bulkCollection } : {}),
        ...(bulkAction === 'SET_LOW_STOCK' ? { lowStockThreshold: bulkThreshold } : {}),
      },
    }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['products'] }), queryClient.invalidateQueries({ queryKey: ['collections'] }), queryClient.invalidateQueries({ queryKey: ['inventory'] })]); setSelected(new Set()); },
  });

  if (productsQuery.isLoading || categoriesQuery.isLoading || collectionsQuery.isLoading) return <LoadingState label="Loading products" />;
  const categories = categoriesQuery.data ?? [];
  const collections = collectionsQuery.data ?? [];
  const products = (productsQuery.data ?? []).filter((product) => {
    const matchesSearch = !search || [product.name, product.brand, product.model, product.category?.name, product.variants?.map((item) => item.sku).join(' ')].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !status || product.status === status;
    const matchesCategory = !categoryFilter || product.categoryId === categoryFilter || product.category?.id === categoryFilter;
    const threshold = product.lowStockThreshold ?? 5;
    const matchesStock = !stockFilter || (stockFilter === 'low' ? product.stock > 0 && product.stock <= threshold : product.stock === 0);
    return matchesSearch && matchesStatus && matchesCategory && matchesStock;
  });
  const allSelected = products.length > 0 && products.every((product) => selected.has(product.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(products.map((product) => product.id)));

  return <div>
    <PageHeader eyebrow="Catalog operations" title="Products" description="Publish rich technology listings, control collections, pricing, compatibility, variants and bulk catalog operations." actions={<Button onClick={() => setEditing(null)}><Plus size={17} /> New product</Button>} />
    <section className="panel">
      <div className="toolbar toolbar--wrap">
        <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, brand, model or SKU" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option value="">All stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
        <span>{products.length} listings</span>
      </div>

      {selected.size ? <div className="bulk-toolbar"><strong>{selected.size} selected</strong><select value={bulkAction} onChange={(event) => setBulkAction(event.target.value)}><option value="ACTIVATE">Publish / activate</option><option value="DEACTIVATE">Move to draft</option><option value="ARCHIVE">Archive</option><option value="FEATURE">Mark as featured</option><option value="UNFEATURE">Remove featured status</option><option value="MOVE_CATEGORY">Move to category</option><option value="ADD_COLLECTION">Add to collection</option><option value="REMOVE_COLLECTION">Remove from collection</option><option value="SET_LOW_STOCK">Set low-stock threshold</option>{admin?.role === 'SUPERADMIN' ? <option value="DELETE">Permanently delete</option> : null}</select>{bulkAction === 'MOVE_CATEGORY' ? <select value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select> : null}{['ADD_COLLECTION', 'REMOVE_COLLECTION'].includes(bulkAction) ? <select value={bulkCollection} onChange={(event) => setBulkCollection(event.target.value)}><option value="">Choose collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select> : null}{bulkAction === 'SET_LOW_STOCK' ? <input className="compact-input" type="number" min="0" value={bulkThreshold} onChange={(event) => setBulkThreshold(Number(event.target.value))} /> : null}<Button size="sm" variant={bulkAction === 'DELETE' ? 'danger' : 'primary'} isLoading={bulkMutation.isPending} disabled={(bulkAction.includes('COLLECTION') && !bulkCollection)} onClick={() => { if (bulkAction !== 'DELETE' || window.confirm(`Permanently delete ${selected.size} selected products? Products used in orders will be blocked.`)) bulkMutation.mutate(); }}>Apply action</Button><Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button></div> : null}
      {bulkMutation.error ? <div className="form-alert">{bulkMutation.error.message}</div> : null}

      {products.length ? <div className="table-wrap"><table><thead><tr><th><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all products" /></th><th>Product</th><th>Placement</th><th>Price</th><th>Inventory</th><th>Status</th><th /></tr></thead><tbody>{products.map((product) => { const threshold = product.lowStockThreshold ?? 5; return <tr key={product.id}><td><input type="checkbox" checked={selected.has(product.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(product.id)) next.delete(product.id); else next.add(product.id); return next; })} /></td><td><div className="product-cell"><span className="product-thumb">{product.images?.[0] ? <img src={product.images[0]} alt="" /> : product.name[0]}</span><div><strong>{product.name}</strong><span>{[product.brand, product.model].filter(Boolean).join(' · ') || product.description.slice(0, 58)}</span></div></div></td><td><div className="placement-cell"><strong>{product.category?.name ?? 'Uncategorized'}</strong><span>{product.collections?.map((item) => item.collection.name).join(', ') || 'No collections'}</span></div></td><td><strong>{formatCurrency(product.price)}</strong>{product.costPrice != null ? <span className="table-subtext">Cost {formatCurrency(product.costPrice)}</span> : null}</td><td><Badge tone={product.stock === 0 ? 'danger' : product.stock <= threshold ? 'warning' : 'neutral'}>{product.stock} in stock</Badge><span className="table-subtext">Alert at {threshold}</span></td><td><Badge tone={statusTone(product.status)}>{product.status ?? (product.isActive ? 'ACTIVE' : 'ARCHIVED')}</Badge>{product.isFeatured ? <span className="table-subtext">Featured</span> : null}</td><td><div className="row-actions"><button className="icon-button" onClick={() => setEditing(product)} title="Edit"><Pencil size={16} /></button><button className="icon-button icon-button--danger" onClick={() => setDeleting(product)} title="Archive"><Archive size={16} /></button></div></td></tr>; })}</tbody></table></div> : <EmptyState icon={Boxes} title="No products found" description="Create the first listing or adjust your filters." actionLabel="Create product" onAction={() => setEditing(null)} />}
    </section>
    <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit product' : 'Create product'} description="Control the complete technology listing, inventory rules and storefront placement." size="lg"><ProductForm product={editing} categories={categories} collections={collections} isSubmitting={saveMutation.isPending} onCancel={() => setEditing(undefined)} onSubmit={async (values) => { await saveMutation.mutateAsync({ values, product: editing }); }} />{saveMutation.error ? <div className="form-alert">{saveMutation.error.message}</div> : null}</Modal>
    <ConfirmDialog isOpen={Boolean(deleting)} title="Archive this product?" description={`${deleting?.name ?? 'This listing'} will be removed from the storefront but retained for order history and reporting.`} confirmLabel="Archive product" isLoading={deleteMutation.isPending} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} />
  </div>;
}
