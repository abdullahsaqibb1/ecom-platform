import { useQuery } from '@tanstack/react-query';
import { ExternalLink, PackageCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatMoney } from '../lib/format';
import { getOrders } from '../lib/api';

export function AccountPage() {
  const { user, loading, logout } = useAuth();
  const query = useQuery({
    queryKey: ['customer-orders'],
    queryFn: getOrders,
    enabled: Boolean(user),
    refetchInterval: (state) => state.state.data?.some((order) => order.paymentStatus === 'PROCESSING') ? 5000 : false,
  });
  const orders = query.data ?? [];
  if (loading) return <div className="page-loader">Loading account…</div>;
  if (!user) return <Navigate to="/login" state={{ from: '/account' }} replace />;

  return <section className="account-page">
    <div className="account-head"><div><p className="eyebrow">Your account</p><h1>Hello{user.name ? `, ${user.name.split(' ')[0]}` : ''}</h1><p>{user.email}</p></div><button className="text-link" onClick={logout}>Sign out</button></div>
    <div className="account-layout"><aside><a href="#orders" className="active">Order history</a><a href="#details">Account details</a></aside><div id="orders"><h2>Order history</h2>
      {query.isLoading ? <p>Loading orders…</p> : orders.length === 0 ? <div className="account-empty"><h3>No orders yet</h3><p>Your completed purchases will appear here.</p></div> : <div className="orders-list">{orders.map((order) => <article key={order.id} className="order-card">
        <div><p className="eyebrow">Order {order.id.slice(-8).toUpperCase()}</p><h3>{new Date(order.createdAt).toLocaleDateString()}</h3></div>
        <div className="customer-order-status"><span className={`status ${order.status.toLowerCase()}`}>{order.status}</span><span className={`payment-state ${order.paymentStatus?.toLowerCase() ?? 'unpaid'}`}>{order.paymentStatus ?? 'UNPAID'}</span></div>
        <div className="order-items">{order.items.map((item) => <div key={item.id}><span>{item.productName ?? item.product?.name ?? 'Product'} × {item.quantity}</span><span>{item.variantLabel}</span></div>)}</div>
        <strong>{formatMoney(order.totalAmount ?? order.total)}</strong>
        {order.trackingNumber ? <div className="customer-tracking"><PackageCheck size={18} /><div><strong>{order.carrier || 'Courier'}</strong><span>{order.trackingNumber}</span>{order.estimatedDelivery ? <small>Estimated {new Date(order.estimatedDelivery).toLocaleDateString()}</small> : null}</div>{order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noreferrer">Track <ExternalLink size={13} /></a> : null}</div> : null}
      </article>)}</div>}
      <section id="details" className="account-details"><h2>Account details</h2><p>{user.name}</p><p>{user.email}</p></section>
    </div></div>
  </section>;
}
