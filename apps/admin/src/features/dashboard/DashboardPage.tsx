import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Boxes, CircleDollarSign, Layers3, PackageCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { LoadingState } from '../../components/LoadingState';
import { PageHeader } from '../../components/PageHeader';
import { ADMIN_API, apiRequest, unwrapEntity, unwrapList } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/format';
import type { DashboardMetrics, InventoryMovement, Order } from '../../types/domain';

interface DashboardPayload { metrics: DashboardMetrics; recentMovements: InventoryMovement[] }

export function DashboardPage() {
  const dashboardQuery = useQuery({ queryKey: ['dashboard'], queryFn: async () => unwrapEntity<DashboardPayload>(await apiRequest(ADMIN_API.dashboard)) });
  const ordersQuery = useQuery({ queryKey: ['orders', 'dashboard'], queryFn: async () => unwrapList<Order>(await apiRequest(ADMIN_API.orders), ['orders']) });
  if (dashboardQuery.isLoading || ordersQuery.isLoading) return <LoadingState label="Loading store overview" />;
  const metrics = dashboardQuery.data?.metrics;
  const movements = dashboardQuery.data?.recentMovements ?? [];
  const orders = ordersQuery.data ?? [];
  return <div>
    <PageHeader eyebrow="Command center" title="Store operations" description="A live view of catalog health, inventory risk, merchandising and order activity." />
    <section className="metric-grid">
      <article className="metric-card"><span className="metric-icon"><Boxes size={21} /></span><div><small>Active products</small><strong>{metrics?.activeProducts ?? 0}</strong><span>{metrics?.productCount ?? 0} total records</span></div></article>
      <article className="metric-card"><span className="metric-icon"><PackageCheck size={21} /></span><div><small>Orders</small><strong>{metrics?.orderCount ?? 0}</strong><span>{orders.filter((order) => order.status === 'PENDING').length} pending</span></div></article>
      <article className="metric-card"><span className="metric-icon"><CircleDollarSign size={21} /></span><div><small>Paid revenue</small><strong>{formatCurrency(metrics?.revenue ?? 0)}</strong><span>Webhook and manually verified payments</span></div></article>
      <article className="metric-card"><span className="metric-icon metric-icon--warning"><TriangleAlert size={21} /></span><div><small>Inventory risk</small><strong>{(metrics?.lowStockProducts ?? 0) + (metrics?.outOfStockProducts ?? 0)}</strong><span>{metrics?.outOfStockProducts ?? 0} out of stock</span></div></article>
    </section>
    <section className="mini-metric-row"><article><Layers3 size={18} /><div><strong>{metrics?.collectionCount ?? 0}</strong><span>Collections</span></div></article><article><BadgePercent size={18} /><div><strong>{metrics?.activeDiscounts ?? 0}</strong><span>Active discounts</span></div></article><article><TriangleAlert size={18} /><div><strong>{metrics?.lowStockProducts ?? 0}</strong><span>Low-stock products</span></div></article></section>
    <section className="dashboard-grid">
      <article className="panel"><header className="panel__header"><div><h2>Recent orders</h2><p>Latest customer activity</p></div></header><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Status</th><th>Total</th><th>Placed</th></tr></thead><tbody>{orders.slice(0, 7).map((order) => <tr key={order.id}><td><strong>#{order.id.slice(-8).toUpperCase()}</strong></td><td>{order.user?.email ?? order.customer?.email ?? 'Customer'}</td><td><Badge tone={order.paymentStatus === 'PAID' ? 'success' : order.paymentStatus === 'FAILED' ? 'danger' : 'warning'}>{order.paymentStatus ?? 'UNPAID'}</Badge><span className="table-subtext">{order.paymentMethodCode ?? order.paymentProvider}</span></td><td><Badge tone={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'danger' : order.status === 'PENDING' ? 'warning' : 'info'}>{order.status}</Badge></td><td>{formatCurrency(order.totalAmount ?? order.total)}</td><td>{formatDate(order.createdAt)}</td></tr>)}</tbody></table></div></article>
      <article className="panel"><header className="panel__header"><div><h2>Inventory activity</h2><p>Latest stock movements</p></div></header><div className="movement-list">{movements.map((movement) => <div key={movement.id}><span className={`movement-dot ${movement.quantityChange > 0 ? 'movement-dot--positive' : 'movement-dot--negative'}`} /><div><strong>{movement.product.name}</strong><span>{movement.variant?.sku ? `${movement.variant.sku} · ` : ''}{movement.reason || movement.type}</span></div><div><strong>{movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}</strong><small>{formatDate(movement.createdAt)}</small></div></div>)}</div></article>
    </section>
  </div>;
}
