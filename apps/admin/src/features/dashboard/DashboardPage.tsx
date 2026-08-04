import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Boxes, CircleDollarSign, Layers3, PackageCheck, TrendingUp, TriangleAlert, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../components/Badge';
import { LoadingState } from '../../components/LoadingState';
import { PageHeader } from '../../components/PageHeader';
import { ADMIN_API, apiRequest, unwrapEntity, unwrapList } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/format';
import type { DashboardMetrics, FinanceDashboard, InventoryMovement, Order } from '../../types/domain';

interface DashboardPayload { metrics: DashboardMetrics; finance: FinanceDashboard; recentMovements: InventoryMovement[] }
type FinanceRange = FinanceDashboard['range'];
const ranges: Array<{ value: FinanceRange; label: string }> = [
  { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }, { value: '365d', label: '1 year' }, { value: 'all', label: 'All time' },
];

export function DashboardPage() {
  const [range, setRange] = useState<FinanceRange>('30d');
  const dashboardQuery = useQuery({ queryKey: ['dashboard', range], queryFn: async () => unwrapEntity<DashboardPayload>(await apiRequest(`${ADMIN_API.dashboard}?range=${range}`)) });
  const ordersQuery = useQuery({ queryKey: ['orders', 'dashboard'], queryFn: async () => unwrapList<Order>(await apiRequest(ADMIN_API.orders), ['orders']) });
  if (dashboardQuery.isLoading || ordersQuery.isLoading) return <LoadingState label="Loading store overview" />;
  const metrics = dashboardQuery.data?.metrics;
  const finance = dashboardQuery.data?.finance;
  const movements = dashboardQuery.data?.recentMovements ?? [];
  const orders = ordersQuery.data ?? [];
  const maxChartValue = Math.max(1, ...(finance?.timeline.map((point) => point.revenue) ?? [1]));

  return <div>
    <PageHeader eyebrow="Commerce overview" title="Store performance" description="Inventory investment, paid sales, realized product cost and gross profit in one operating view." actions={<label className="range-control"><span>Reporting period</span><select value={range} onChange={(event) => setRange(event.target.value as FinanceRange)}>{ranges.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>} />

    <section className="finance-hero-grid">
      <article className="finance-card finance-card--primary"><span>Paid revenue</span><strong>{formatCurrency(finance?.totalRevenue ?? 0)}</strong><small>{finance?.paidOrderCount ?? 0} paid orders · Avg. {formatCurrency(finance?.averageOrderValue ?? 0)}</small></article>
      <article className="finance-card"><span>Stock investment</span><strong>{formatCurrency(finance?.inventoryInvestment ?? 0)}</strong><small>{finance?.inventoryUnits ?? 0} units currently held</small></article>
      <article className="finance-card"><span>Realized product cost</span><strong>{formatCurrency(finance?.cogs ?? 0)}</strong><small>Cost captured when each sale was placed</small></article>
      <article className="finance-card"><span>Gross profit</span><strong>{formatCurrency(finance?.grossProfit ?? 0)}</strong><small>{(finance?.grossMargin ?? 0).toFixed(1)}% margin before delivery and payment fees</small></article>
    </section>

    {(finance?.inventoryMissingCostUnits ?? 0) > 0 || (finance?.salesMissingCostUnits ?? 0) > 0 ? <div className="finance-data-warning"><TriangleAlert size={18} /><div><strong>Purchase cost data is incomplete</strong><span>{finance?.inventoryMissingCostUnits ?? 0} stocked units and {finance?.salesMissingCostUnits ?? 0} sold units have no captured cost. Investment and profit values exclude those missing costs until they are entered on the product or configuration.</span></div></div> : null}

    <section className="metric-grid metric-grid--editorial">
      <article className="metric-card"><span className="metric-icon"><Boxes size={20} /></span><div><small>Active products</small><strong>{metrics?.activeProducts ?? 0}</strong><span>{metrics?.productCount ?? 0} total listings</span></div></article>
      <article className="metric-card"><span className="metric-icon"><PackageCheck size={20} /></span><div><small>Orders</small><strong>{metrics?.orderCount ?? 0}</strong><span>{orders.filter((order) => order.status === 'PENDING').length} pending</span></div></article>
      <article className="metric-card"><span className="metric-icon"><WalletCards size={20} /></span><div><small>Retail stock value</small><strong>{formatCurrency(finance?.inventoryRetailValue ?? 0)}</strong><span>{formatCurrency(finance?.inventoryPotentialProfit ?? 0)} potential margin</span></div></article>
      <article className="metric-card"><span className="metric-icon metric-icon--warning"><TriangleAlert size={20} /></span><div><small>Inventory risk</small><strong>{(metrics?.lowStockProducts ?? 0) + (metrics?.outOfStockProducts ?? 0)}</strong><span>{metrics?.outOfStockProducts ?? 0} out of stock</span></div></article>
    </section>

    <section className="dashboard-grid dashboard-grid--finance">
      <article className="panel finance-chart-panel"><header className="panel__header"><div><h2>Revenue and cost</h2><p>Daily paid product revenue compared with captured purchase cost</p></div><TrendingUp size={19} /></header><div className="finance-chart">{finance?.timeline.length ? finance.timeline.map((point) => <div className="finance-chart__day" key={point.date} title={`${point.date}: ${formatCurrency(point.revenue)} revenue`}><div className="finance-chart__bars"><span className="finance-chart__bar finance-chart__bar--revenue" style={{ height: `${Math.max(4, (point.revenue / maxChartValue) * 100)}%` }} /><span className="finance-chart__bar finance-chart__bar--cost" style={{ height: `${Math.max(2, (point.cost / maxChartValue) * 100)}%` }} /></div><small>{new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></div>) : <div className="chart-empty">Paid sales will appear here.</div>}</div><div className="chart-legend"><span><i className="legend-dot legend-dot--revenue" />Product revenue</span><span><i className="legend-dot legend-dot--cost" />Purchase cost</span></div></article>
      <article className="panel"><header className="panel__header"><div><h2>Most profitable products</h2><p>Based on paid order items</p></div></header><div className="profit-list">{finance?.topProducts.length ? finance.topProducts.map((product, index) => <div key={product.productId}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{product.name}</strong><small>{product.unitsSold} sold · Revenue {formatCurrency(product.revenue)}</small></div><strong>{formatCurrency(product.grossProfit)}</strong></div>) : <div className="chart-empty">No paid product sales yet.</div>}</div></article>
    </section>

    <section className="mini-metric-row"><article><Layers3 size={18} /><div><strong>{metrics?.collectionCount ?? 0}</strong><span>Collections</span></div></article><article><BadgePercent size={18} /><div><strong>{metrics?.activeDiscounts ?? 0}</strong><span>Active discounts</span></div></article><article><CircleDollarSign size={18} /><div><strong>{formatCurrency(finance?.discounts ?? 0)}</strong><span>Discounts used</span></div></article></section>

    <section className="dashboard-grid">
      <article className="panel"><header className="panel__header"><div><h2>Recent orders</h2><p>Latest customer activity</p></div></header><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Status</th><th>Total</th><th>Placed</th></tr></thead><tbody>{orders.slice(0, 7).map((order) => <tr key={order.id}><td><strong>#{order.id.slice(-8).toUpperCase()}</strong></td><td>{order.user?.email ?? order.customer?.email ?? 'Customer'}</td><td><Badge tone={order.paymentStatus === 'PAID' ? 'success' : order.paymentStatus === 'FAILED' ? 'danger' : 'warning'}>{order.paymentStatus ?? 'UNPAID'}</Badge><span className="table-subtext">{order.paymentMethodCode ?? order.paymentProvider}</span></td><td><Badge tone={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'danger' : order.status === 'PENDING' ? 'warning' : 'info'}>{order.status}</Badge></td><td>{formatCurrency(order.totalAmount ?? order.total)}</td><td>{formatDate(order.createdAt)}</td></tr>)}</tbody></table></div></article>
      <article className="panel"><header className="panel__header"><div><h2>Inventory activity</h2><p>Latest stock movements</p></div></header><div className="movement-list">{movements.map((movement) => <div key={movement.id}><span className={`movement-dot ${movement.quantityChange > 0 ? 'movement-dot--positive' : 'movement-dot--negative'}`} /><div><strong>{movement.product.name}</strong><span>{movement.variant?.sku ? `${movement.variant.sku} · ` : ''}{movement.reason || movement.type}</span></div><div><strong>{movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}</strong><small>{formatDate(movement.createdAt)}</small></div></div>)}</div></article>
    </section>
  </div>;
}
