import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { createOrder } from '../lib/api';
import { formatMoney } from '../lib/format';

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: user?.name ?? '', phone: '', address1: '', city: '', province: '', postalCode: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (loading) return <div className="page-loader">Loading checkout…</div>;
  if (!user) return <Navigate to="/login" state={{ from: '/checkout' }} replace />;
  if (items.length === 0) return <Navigate to="/collections/all" replace />;

  const shipping = subtotal >= 2500 ? 0 : 300;
  return <section className="checkout-page"><div className="checkout-form"><p className="eyebrow">Secure checkout</p><h1>Delivery details</h1><form onSubmit={async (e) => { e.preventDefault(); setError(''); setSubmitting(true); try { await createOrder({ items: items.map((item) => ({ productId: item.product.id, variantId: item.variant?.id, quantity: item.quantity })), shippingAddress: form }); clearCart(); navigate('/account?order=placed'); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to place the order.'); } finally { setSubmitting(false); } }}><div className="form-grid"><label className="wide">Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label className="wide">Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label><label className="wide">Address<input value={form.address1} onChange={(e) => setForm({ ...form, address1: e.target.value })} required /></label><label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></label><label>Province<input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} required /></label><label>Postal code<input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></label></div><div className="payment-placeholder"><strong>Payment</strong><p>The backend currently creates a pending order. Stripe or a Pakistan-supported gateway can be connected here next.</p></div>{error && <p className="form-error">{error}</p>}<button className="button dark full" disabled={submitting}>{submitting ? 'Placing order…' : `Place order · ${formatMoney(subtotal + shipping)}`}</button></form></div><aside className="checkout-summary"><h2>Your selection</h2>{items.map((item) => <div className="summary-line" key={item.key}><img src={item.product.images[0]} alt={item.product.name} /><div><strong>{item.product.name}</strong><span>{[item.variant?.color, item.variant?.size].filter(Boolean).join(' / ')}</span><span>Qty {item.quantity}</span></div><b>{formatMoney(Number(item.variant?.price ?? item.product.price) * item.quantity)}</b></div>)}<div className="summary-totals"><div><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div><div><span>Delivery</span><span>{shipping ? formatMoney(shipping) : 'Complimentary'}</span></div><div className="grand-total"><span>Total</span><strong>{formatMoney(subtotal + shipping)}</strong></div></div></aside></section>;
}
