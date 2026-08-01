import { useQuery } from '@tanstack/react-query';
import { Boxes, CircleDollarSign, PackageCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { LoadingState } from '../../components/LoadingState';
import { PageHeader } from '../../components/PageHeader';
import { ADMIN_API, apiRequest, unwrapList } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Order, Product } from '../../types/domain';

export function DashboardPage() {
  const productsQuery = useQuery({ queryKey: ['products', 'dashboard'], queryFn: async () => unwrapList<Product>(await apiRequest(ADMIN_API.products), ['products']) });
  const ordersQuery = useQuery({ queryKey: ['orders', 'dashboard'], queryFn: async () => unwrapList<Order>(await apiRequest(ADMIN_API.orders), ['orders']) });
  if (productsQuery.isLoading || ordersQuery.isLoading) return <LoadingState label="Loading store overview" />;
  const products = productsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const revenue = orders.filter((o) => ['PAID','SHIPPED','DELIVERED'].includes(o.status)).reduce((sum, o) => sum + Number(o.totalAmount ?? o.total ?? 0), 0);
  const pending = orders.filter((o) => o.status === 'PENDING').length;
  const lowStock = products.filter((p) => p.stock <= 5 && p.isActive).length;
  return (
    <div>
      <PageHeader eyebrow="Command center" title="Store overview" description="A concise view of catalog health, order activity, and operational priorities." />
      <section className="metric-grid">
        <article className="metric-card"><span className="metric-icon"><Boxes size={21} /></span><div><small>Active products</small><strong>{products.filter((p) => p.isActive).length}</strong><span>{products.length} total listings</span></div></article>
        <article className="metric-card"><span className="metric-icon"><PackageCheck size={21} /></span><div><small>Orders</small><strong>{orders.length}</strong><span>{pending} awaiting payment</span></div></article>
        <article className="metric-card"><span className="metric-icon"><CircleDollarSign size={21} /></span><div><small>Processed value</small><strong>{formatCurrency(revenue)}</strong><span>Paid, shipped, and delivered</span></div></article>
        <article className="metric-card"><span className="metric-icon metric-icon--warning"><TriangleAlert size={21} /></span><div><small>Low stock</small><strong>{lowStock}</strong><span>Active products at 5 or fewer</span></div></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel"><header className="panel__header"><div><h2>Recent orders</h2><p>Latest customer activity</p></div></header><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Placed</th></tr></thead><tbody>{orders.slice(0,6).map((o) => <tr key={o.id}><td><strong>#{o.id.slice(-8).toUpperCase()}</strong></td><td>{o.user?.email ?? o.customer?.email ?? 'Customer'}</td><td><Badge tone={o.status === 'DELIVERED' ? 'success' : o.status === 'CANCELLED' ? 'danger' : o.status === 'PENDING' ? 'warning' : 'info'}>{o.status}</Badge></td><td>{formatCurrency(o.totalAmount ?? o.total)}</td><td>{formatDate(o.createdAt)}</td></tr>)}</tbody></table></div></article>
        <article className="panel"><header className="panel__header"><div><h2>Inventory watch</h2><p>Products needing attention</p></div></header><div className="inventory-list">{products.filter((p) => p.stock <= 10).slice(0,7).map((p) => <div key={p.id}><span className="product-thumb">{p.images?.[0] ? <img src={p.images[0]} alt="" /> : p.name.slice(0,1)}</span><div><strong>{p.name}</strong><span>{p.category?.name ?? 'Uncategorized'}</span></div><Badge tone={p.stock <= 5 ? 'danger' : 'warning'}>{p.stock} left</Badge></div>)}</div></article>
      </section>
    </div>
  );
}
