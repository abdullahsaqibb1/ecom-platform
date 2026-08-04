import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { createOrder } from '../lib/api';
import { formatMoney } from '../lib/format';

const FREE_SHIPPING_THRESHOLD = Number(import.meta.env.VITE_FREE_SHIPPING_THRESHOLD ?? 2500);
const FLAT_SHIPPING_RATE = Number(import.meta.env.VITE_FLAT_SHIPPING_RATE ?? 300);

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ fullName: user?.name ?? '', phone: '', address1: '', city: '', province: '', postalCode: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (loading) return <div className="page-loader">Loading checkout…</div>;
  if (!user) return <Navigate to="/login" state={{ from: '/checkout' }} replace />;
  if (items.length === 0) return <Navigate to="/collections/all" replace />;

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
  return <section className="checkout-page">
    <div className="checkout-form">
      <p className="eyebrow">Secure checkout</p>
      <h1>Delivery details</h1>
      <form onSubmit={async (event) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);
        try {
          const result = await createOrder({
            items: items.map((item) => ({ productId: item.product.id, variantId: item.variant?.id, quantity: item.quantity })),
            shippingAddress: form,
          });
          if (result.payment.checkoutUrl) {
            window.location.assign(result.payment.checkoutUrl);
            return;
          }
          clearCart();
          window.location.assign('/account?order=placed');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unable to place the order.');
          setSubmitting(false);
        }
      }}>
        <div className="form-grid">
          <label className="wide">Full name<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label>
          <label className="wide">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></label>
          <label className="wide">Address<input value={form.address1} onChange={(event) => setForm({ ...form, address1: event.target.value })} required /></label>
          <label>City<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required /></label>
          <label>Province<input value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} required /></label>
          <label>Postal code<input value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} /></label>
        </div>
        <div className="payment-placeholder payment-provider-card"><ShieldCheck size={19} /><div><strong>Secure payment with Safepay</strong><p>Your order total is calculated by our server. Payment is confirmed only after Safepay sends a verified notification to the store.</p></div></div>
        {error && <p className="form-error">{error}</p>}
        <button className="button dark full" disabled={submitting}>{submitting ? 'Opening secure payment…' : `Continue to payment · ${formatMoney(subtotal + shipping)}`}</button>
      </form>
    </div>
    <aside className="checkout-summary">
      <h2>Your selection</h2>
      {items.map((item) => <div className="summary-line" key={item.key}><img src={item.product.images[0]} alt={item.product.name} /><div><strong>{item.product.name}</strong><span>{[item.variant?.size, item.variant?.color].filter(Boolean).join(' / ')}</span><span>Qty {item.quantity}</span></div><b>{formatMoney(Number(item.variant?.price ?? item.product.price) * item.quantity)}</b></div>)}
      <div className="summary-totals"><div><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div><div><span>Delivery</span><span>{shipping ? formatMoney(shipping) : 'Complimentary'}</span></div><div className="grand-total"><span>Total</span><strong>{formatMoney(subtotal + shipping)}</strong></div></div>
    </aside>
  </section>;
}
