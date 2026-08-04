import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Boxes, History, Search, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { ADMIN_API, apiRequest, unwrapList } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { InventoryMovement, Product, ProductVariant } from '../../types/domain';

interface AdjustmentTarget { product: Product; variant?: ProductVariant | null }

function stockRisk(product: Product) {
  const variants = product.variants ?? [];
  if (variants.length) {
    return {
      isOut: variants.every((variant) => variant.stock === 0),
      isLow: variants.some((variant) => variant.stock > 0 && variant.stock <= (variant.lowStockThreshold ?? 3)),
    };
  }
  return {
    isOut: product.stock === 0,
    isLow: product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 5),
  };
}

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [target, setTarget] = useState<AdjustmentTarget | null>(null);
  const [quantityChange, setQuantityChange] = useState(1);
  const [type, setType] = useState('RESTOCK');
  const [reason, setReason] = useState('New stock received');
  const [reference, setReference] = useState('');
  const productsQuery = useQuery({ queryKey: ['inventory'], queryFn: async () => unwrapList<Product>(await apiRequest(ADMIN_API.inventory), ['products']) });
  const movementsQuery = useQuery({ queryKey: ['inventory-movements'], queryFn: async () => unwrapList<InventoryMovement>(await apiRequest(`${ADMIN_API.inventoryMovements}?limit=50`), ['movements']) });
  const products = productsQuery.data ?? [];
  const filtered = useMemo(() => products.filter((product) => {
    const text = [product.name, product.brand, product.model, product.variants?.map((variant) => variant.sku).join(' ')].filter(Boolean).join(' ').toLowerCase();
    const risk = stockRisk(product);
    return text.includes(search.toLowerCase()) && (filter === 'all' || (filter === 'low' ? risk.isLow : risk.isOut));
  }), [products, search, filter]);
  const adjustmentMutation = useMutation({
    mutationFn: () => apiRequest(ADMIN_API.inventoryAdjust, { method: 'POST', body: { productId: target?.product.id, variantId: target?.variant?.id ?? null, quantityChange, type, reason, reference: reference || null } }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['inventory'] }), queryClient.invalidateQueries({ queryKey: ['inventory-movements'] }), queryClient.invalidateQueries({ queryKey: ['products'] })]); setTarget(null); },
  });
  if (productsQuery.isLoading || movementsQuery.isLoading) return <LoadingState label="Loading inventory" />;
  const movements = movementsQuery.data ?? [];
  const units = products.reduce((sum, product) => sum + product.stock, 0);
  const low = products.filter((product) => stockRisk(product).isLow).length;
  const out = products.filter((product) => stockRisk(product).isOut).length;

  function openAdjustment(product: Product, variant?: ProductVariant | null) {
    setTarget({ product, variant }); setQuantityChange(1); setType('RESTOCK'); setReason('New stock received'); setReference('');
  }

  return <div>
    <PageHeader eyebrow="Stock control" title="Inventory" description="Track stock on hand, configuration-level availability, low-stock thresholds and a complete adjustment ledger." />
    <section className="metric-grid metric-grid--compact"><article className="metric-card"><span className="metric-icon"><Boxes size={20} /></span><div><small>Units on hand</small><strong>{units}</strong><span>Across active catalog records</span></div></article><article className="metric-card"><span className="metric-icon metric-icon--warning"><TriangleAlert size={20} /></span><div><small>Low stock</small><strong>{low}</strong><span>At or below their threshold</span></div></article><article className="metric-card"><span className="metric-icon metric-icon--warning"><TriangleAlert size={20} /></span><div><small>Out of stock</small><strong>{out}</strong><span>Require replenishment</span></div></article></section>
    <section className="panel"><div className="toolbar toolbar--wrap"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, models or SKUs" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select></div>
      <div className="inventory-catalog">{filtered.map((product) => <article className="inventory-product" key={product.id}><div className="inventory-product__header"><div className="product-cell"><span className="product-thumb">{product.images?.[0] ? <img src={product.images[0]} alt="" /> : product.name[0]}</span><div><strong>{product.name}</strong><span>{[product.brand, product.model].filter(Boolean).join(' · ') || product.category?.name}</span></div></div><div className="inventory-product__summary"><Badge tone={product.stock === 0 ? 'danger' : product.stock <= (product.lowStockThreshold ?? 5) ? 'warning' : 'neutral'}>{product.stock} total</Badge>{!product.variants?.length ? <Button size="sm" variant="secondary" onClick={() => openAdjustment(product)}><SlidersHorizontal size={15} /> Adjust</Button> : null}</div></div>{product.variants?.length ? <div className="variant-stock-list">{product.variants.map((variant) => <div key={variant.id}><div><strong>{variant.sku}</strong><span>{[variant.size, variant.color].filter(Boolean).join(' · ') || 'Default configuration'}</span></div><Badge tone={variant.stock === 0 ? 'danger' : variant.stock <= (variant.lowStockThreshold ?? 3) ? 'warning' : 'neutral'}>{variant.stock} units</Badge><span className="threshold-copy">Alert at {variant.lowStockThreshold ?? 3}</span><Button size="sm" variant="ghost" onClick={() => openAdjustment(product, variant)}><SlidersHorizontal size={15} /> Adjust</Button></div>)}</div> : null}</article>)}</div>
    </section>
    <section className="panel"><header className="panel__header"><div><h2>Inventory movement history</h2><p>Every sale, cancellation, restock and manual adjustment.</p></div><History size={20} /></header><div className="table-wrap"><table><thead><tr><th>Item</th><th>Movement</th><th>Reason</th><th>Stock after</th><th>Admin / reference</th><th>Date</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td><strong>{movement.product.name}</strong><span className="table-subtext">{movement.variant ? `${movement.variant.sku} · ${[movement.variant.size, movement.variant.color].filter(Boolean).join(' / ')}` : 'Product total'}</span></td><td><span className={`movement-value ${movement.quantityChange > 0 ? 'movement-value--positive' : 'movement-value--negative'}`}>{movement.quantityChange > 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}</span><span className="table-subtext">{movement.type}</span></td><td>{movement.reason || '—'}</td><td>{movement.stockAfter}</td><td>{movement.admin?.name || movement.admin?.email || 'System'}<span className="table-subtext">{movement.reference || ''}</span></td><td>{formatDate(movement.createdAt)}</td></tr>)}</tbody></table></div></section>

    <Modal isOpen={Boolean(target)} onClose={() => setTarget(null)} title="Adjust inventory" description={target ? `${target.product.name}${target.variant ? ` · ${target.variant.sku}` : ''}` : ''} size="sm"><form className="form-stack" onSubmit={(event) => { event.preventDefault(); adjustmentMutation.mutate(); }}><label className="field"><span>Adjustment type</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="RESTOCK">Restock</option><option value="ADJUSTMENT">Manual correction</option><option value="RETURN">Customer return</option><option value="DAMAGE">Damaged / write-off</option></select></label><label className="field"><span>Quantity change</span><input type="number" value={quantityChange} onChange={(event) => setQuantityChange(Number(event.target.value))} /><small>Use a positive number to add stock and a negative number to remove it.</small></label><label className="field"><span>Reason</span><textarea required minLength={3} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label><label className="field"><span>Reference</span><input placeholder="Supplier invoice, return ID, note…" value={reference} onChange={(event) => setReference(event.target.value)} /></label>{adjustmentMutation.error ? <div className="form-alert">{adjustmentMutation.error.message}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button type="submit" isLoading={adjustmentMutation.isPending}>Save adjustment</Button></div></form></Modal>
  </div>;
}
