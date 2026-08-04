import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, ExternalLink, Eye, PackageCheck, Search, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { ADMIN_API, apiRequest, unwrapEntity, unwrapList } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/format';
import type { Order, OrderStatus, PaymentStatus } from '../../types/domain';

const statuses: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const allowedNext: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: [],
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

function paymentTone(status?: PaymentStatus) {
  if (status === 'PAID') return 'success' as const;
  if (status === 'FAILED' || status === 'REFUNDED') return 'danger' as const;
  if (status === 'PROCESSING') return 'warning' as const;
  return 'neutral' as const;
}

interface ShipmentForm {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  estimatedDelivery: string;
}

const emptyShipment: ShipmentForm = { carrier: '', trackingNumber: '', trackingUrl: '', estimatedDelivery: '' };

function toLocalDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function OrdersPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [shipment, setShipment] = useState<ShipmentForm>(emptyShipment);

  useEffect(() => {
    setShipment(selected ? {
      carrier: selected.carrier ?? '',
      trackingNumber: selected.trackingNumber ?? '',
      trackingUrl: selected.trackingUrl ?? '',
      estimatedDelivery: toLocalDateTime(selected.estimatedDelivery),
    } : emptyShipment);
  }, [selected]);

  const query = useQuery({
    queryKey: ['orders', status],
    queryFn: async () => unwrapList<Order>(
      await apiRequest(`${ADMIN_API.orders}${status === 'ALL' ? '' : `?status=${status}`}`),
      ['orders'],
    ),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status: next }: { id: string; status: OrderStatus }) => unwrapEntity<Order>(
      await apiRequest(ADMIN_API.orderStatus(id), { method: 'PATCH', body: { status: next } }),
      ['order'],
    ),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelected(order);
    },
  });


  const paymentMutation = useMutation({
    mutationFn: async ({ id, paymentStatus }: { id: string; paymentStatus: 'PAID' | 'UNPAID' | 'REFUNDED' }) => unwrapEntity<Order>(
      await apiRequest(ADMIN_API.orderPayment(id), { method: 'PATCH', body: { paymentStatus } }),
      ['order'],
    ),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelected(order);
    },
  });

  const shipmentMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ShipmentForm }) => unwrapEntity<Order>(
      await apiRequest(ADMIN_API.orderShipment(id), {
        method: 'PATCH',
        body: {
          carrier: values.carrier,
          trackingNumber: values.trackingNumber,
          trackingUrl: values.trackingUrl || null,
          estimatedDelivery: values.estimatedDelivery ? new Date(values.estimatedDelivery).toISOString() : null,
        },
      }),
      ['order'],
    ),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelected(order);
    },
  });

  if (query.isLoading) return <LoadingState label="Loading orders" />;
  const orders = (query.data ?? []).filter((order) => {
    const customer = order.user?.email ?? order.customer?.email ?? '';
    const needle = search.toLowerCase();
    return order.id.toLowerCase().includes(needle)
      || customer.toLowerCase().includes(needle)
      || (order.trackingNumber ?? '').toLowerCase().includes(needle);
  });

  return <div>
    <PageHeader eyebrow="Fulfilment" title="Orders" description="Manage payment confirmation, shipment tracking and order status from one fulfilment workspace." />
    <section className="panel">
      <div className="toolbar toolbar--wrap">
        <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, or tracking" /></label>
        <div className="filter-tabs"><button className={status === 'ALL' ? 'active' : ''} onClick={() => setStatus('ALL')}>All</button>{statuses.map((item) => <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>{item}</button>)}</div>
      </div>
      {orders.length ? <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Placed</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}>
        <td><strong>#{order.id.slice(-8).toUpperCase()}</strong>{order.trackingNumber ? <span className="table-subline">{order.trackingNumber}</span> : null}</td>
        <td><div className="stacked-cell"><strong>{order.user?.name ?? order.customer?.name ?? 'Customer'}</strong><span>{order.user?.email ?? order.customer?.email ?? '—'}</span></div></td>
        <td>{order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</td>
        <td><strong>{formatCurrency(order.totalAmount ?? order.total)}</strong></td>
        <td><Badge tone={paymentTone(order.paymentStatus)}>{order.paymentStatus ?? 'UNPAID'}</Badge><span className="table-subline">{order.paymentMethodCode ?? order.paymentProvider ?? '—'}</span></td>
        <td><Badge tone={tone(order.status)}>{order.status}</Badge></td>
        <td>{formatDate(order.createdAt)}</td>
        <td><button className="icon-button" onClick={() => setSelected(order)} title="View order"><Eye size={17} /></button></td>
      </tr>)}</tbody></table></div> : <EmptyState icon={PackageCheck} title="No matching orders" description="No orders match the selected status or search." />}
    </section>

    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={`Order #${selected?.id.slice(-8).toUpperCase() ?? ''}`} description={selected ? `Placed ${formatDate(selected.createdAt)}` : ''} size="lg">
      {selected ? <div className="order-detail">
        <div className="order-detail__summary">
          <div><span>Customer</span><strong>{selected.user?.name ?? selected.customer?.name ?? 'Customer'}</strong><small>{selected.user?.email ?? selected.customer?.email ?? '—'}</small></div>
          <div><span>Order total</span><strong>{formatCurrency(selected.totalAmount ?? selected.total)}</strong><div className="badge-pair"><Badge tone={paymentTone(selected.paymentStatus)}>{selected.paymentStatus ?? 'UNPAID'}</Badge><Badge tone={tone(selected.status)}>{selected.status}</Badge></div></div>
        </div>

        <div className="payment-detail-grid">
          <div><span>Payment method</span><strong>{selected.paymentMethodCode || selected.paymentProvider || '—'}</strong></div>
          <div><span>Payment reference</span><strong>{selected.paymentReference || '—'}</strong></div>
          <div><span>Paid</span><strong>{selected.paidAt ? formatDate(selected.paidAt) : 'Not confirmed'}</strong></div>
          <div><span>Delivery</span><strong>{formatCurrency(selected.shippingTotal ?? 0)}</strong></div><div><span>Discount</span><strong>{selected.discountCode ? `${selected.discountCode} · -${formatCurrency(selected.discountTotal ?? 0)}` : '—'}</strong></div>
        </div>

        {selected.paymentProvider !== 'safepay' ? <div className="manual-payment-panel"><CreditCard size={19} /><div><strong>Manual payment control</strong><span>{selected.paymentMethodCode === 'cod' ? 'Cash-on-delivery orders can ship unpaid and are marked paid when delivered.' : 'Confirm an offline payment only after checking the bank or payment record.'}</span></div><div>{selected.paymentStatus !== 'PAID' ? <Button size="sm" isLoading={paymentMutation.isPending} onClick={() => paymentMutation.mutate({ id: selected.id, paymentStatus: 'PAID' })}>Mark payment received</Button> : <Badge tone="success">Payment confirmed</Badge>}</div></div> : null}
        {paymentMutation.error ? <div className="form-alert">{paymentMutation.error.message}</div> : null}

        <div className="order-items">{selected.items?.map((item) => <div key={item.id}><span className="product-thumb">{item.product?.images?.[0] ? <img src={item.product.images[0]} alt="" /> : 'P'}</span><div><strong>{item.product?.name ?? item.productName ?? 'Product'}</strong><span>{item.variantLabel || `Quantity ${item.quantity}`}</span><span>Quantity {item.quantity}</span></div><strong>{formatCurrency(Number(item.unitPrice ?? item.price ?? 0) * item.quantity)}</strong></div>)}</div>

        {selected.status === 'PAID' || selected.status === 'SHIPPED' || (selected.status === 'PENDING' && selected.paymentMethodCode === 'cod') ? <form className="shipment-panel" onSubmit={(event) => { event.preventDefault(); shipmentMutation.mutate({ id: selected.id, values: shipment }); }}>
          <div className="shipment-panel__heading"><Truck size={19} /><div><strong>{selected.status === 'SHIPPED' ? 'Shipment details' : 'Create shipment'}</strong><span>Saving a paid order as shipped sends the customer a tracking email.</span></div></div>
          <div className="form-grid">
            <label className="field"><span>Carrier</span><input value={shipment.carrier} onChange={(event) => setShipment({ ...shipment, carrier: event.target.value })} placeholder="TCS, Leopards, DHL…" required /></label>
            <label className="field"><span>Tracking number</span><input value={shipment.trackingNumber} onChange={(event) => setShipment({ ...shipment, trackingNumber: event.target.value })} required /></label>
            <label className="field field--wide"><span>Tracking URL</span><input type="url" value={shipment.trackingUrl} onChange={(event) => setShipment({ ...shipment, trackingUrl: event.target.value })} placeholder="https://courier.example/track/..." /></label>
            <label className="field field--wide"><span>Estimated delivery</span><input type="datetime-local" value={shipment.estimatedDelivery} onChange={(event) => setShipment({ ...shipment, estimatedDelivery: event.target.value })} /></label>
          </div>
          {shipmentMutation.error ? <div className="form-alert">{shipmentMutation.error.message}</div> : null}
          <div className="shipment-actions">{selected.trackingUrl ? <a className="button button--secondary button--md" href={selected.trackingUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open tracking</a> : <span />}
            <Button type="submit" isLoading={shipmentMutation.isPending}>{selected.status === 'SHIPPED' ? 'Update tracking' : 'Mark shipped'}</Button>
          </div>
        </form> : null}

        <div className="status-actions"><div><strong>Order status</strong><span>Online payments are webhook-controlled; manual methods can be confirmed by authorized staff. Shipping requires carrier and tracking details.</span></div>{allowedNext[selected.status].length ? <div>{allowedNext[selected.status].map((next) => <Button key={next} variant={next === 'CANCELLED' ? 'danger' : 'primary'} isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: selected.id, status: next })}>Mark {next.toLowerCase()}</Button>)}</div> : <Badge tone={tone(selected.status)}>{selected.status === 'PAID' ? 'Add shipment details above' : 'No direct transition'}</Badge>}</div>
        {updateMutation.error ? <div className="form-alert">{updateMutation.error.message}</div> : null}
        {selected.shippingAddress ? <div className="address-box"><strong>Shipping information</strong><pre>{typeof selected.shippingAddress === 'string' ? selected.shippingAddress : JSON.stringify(selected.shippingAddress, null, 2)}</pre></div> : null}
      </div> : null}
    </Modal>
  </div>;
}
