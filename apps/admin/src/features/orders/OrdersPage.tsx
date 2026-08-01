import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, PackageCheck, Search } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { ADMIN_API, apiRequest, unwrapList } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Order, OrderStatus } from '../../types/domain';

const statuses: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const allowedNext: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};
function tone(status: OrderStatus) {
  if (status === 'DELIVERED') return 'success' as const;
  if (status === 'CANCELLED') return 'danger' as const;
  if (status === 'PENDING') return 'warning' as const;
  return 'info' as const;
}

export function OrdersPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const query = useQuery({ queryKey: ['orders', status], queryFn: async () => unwrapList<Order>(await apiRequest(`${ADMIN_API.orders}${status === 'ALL' ? '' : `?status=${status}`}`), ['orders']) });
  const updateMutation = useMutation({ mutationFn: ({ id, status: next }: { id: string; status: OrderStatus }) => apiRequest(ADMIN_API.orderStatus(id), { method: 'PATCH', body: { status: next } }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['orders'] }); setSelected(null); } });
  if (query.isLoading) return <LoadingState label="Loading orders" />;
  const orders = (query.data ?? []).filter((order) => {
    const customer = order.user?.email ?? order.customer?.email ?? '';
    return order.id.toLowerCase().includes(search.toLowerCase()) || customer.toLowerCase().includes(search.toLowerCase());
  });
  return <div>
    <PageHeader eyebrow="Fulfilment" title="Orders" description="Review purchases and move each order through the approved status lifecycle." />
    <section className="panel">
      <div className="toolbar toolbar--wrap"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order ID or customer" /></label><div className="filter-tabs"><button className={status === 'ALL' ? 'active' : ''} onClick={() => setStatus('ALL')}>All</button>{statuses.map((item) => <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>{item}</button>)}</div></div>
      {orders.length ? <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Placed</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>#{order.id.slice(-8).toUpperCase()}</strong></td><td><div className="stacked-cell"><strong>{order.user?.name ?? order.customer?.name ?? 'Customer'}</strong><span>{order.user?.email ?? order.customer?.email ?? '—'}</span></div></td><td>{order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</td><td><strong>{formatCurrency(order.totalAmount ?? order.total)}</strong></td><td><Badge tone={tone(order.status)}>{order.status}</Badge></td><td>{formatDate(order.createdAt)}</td><td><button className="icon-button" onClick={() => setSelected(order)} title="View order"><Eye size={17} /></button></td></tr>)}</tbody></table></div> : <EmptyState icon={PackageCheck} title="No matching orders" description="No orders match the selected status or search." />}
    </section>
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={`Order #${selected?.id.slice(-8).toUpperCase() ?? ''}`} description={selected ? `Placed ${formatDate(selected.createdAt)}` : ''} size="lg">{selected ? <div className="order-detail"><div className="order-detail__summary"><div><span>Customer</span><strong>{selected.user?.name ?? selected.customer?.name ?? 'Customer'}</strong><small>{selected.user?.email ?? selected.customer?.email ?? '—'}</small></div><div><span>Order total</span><strong>{formatCurrency(selected.totalAmount ?? selected.total)}</strong><Badge tone={tone(selected.status)}>{selected.status}</Badge></div></div><div className="order-items">{selected.items?.map((item) => <div key={item.id}><span className="product-thumb">{item.product?.images?.[0] ? <img src={item.product.images[0]} alt="" /> : 'P'}</span><div><strong>{item.product?.name ?? item.productName ?? 'Product'}</strong><span>Quantity {item.quantity}</span></div><strong>{formatCurrency(Number(item.unitPrice ?? item.price ?? 0) * item.quantity)}</strong></div>)}</div><div className="status-actions"><div><strong>Update status</strong><span>Only valid forward transitions are offered.</span></div>{allowedNext[selected.status].length ? <div>{allowedNext[selected.status].map((next) => <Button key={next} variant={next === 'CANCELLED' ? 'danger' : 'primary'} isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: selected.id, status: next })}>Mark {next.toLowerCase()}</Button>)}</div> : <Badge tone={tone(selected.status)}>Final state</Badge>}</div>{selected.shippingAddress ? <div className="address-box"><strong>Shipping information</strong><pre>{typeof selected.shippingAddress === 'string' ? selected.shippingAddress : JSON.stringify(selected.shippingAddress, null, 2)}</pre></div> : null}</div> : null}</Modal>
  </div>;
}
