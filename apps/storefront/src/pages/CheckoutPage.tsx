import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Check, ShieldCheck } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { createOrder, getPaymentMethods, validateDiscount } from '../lib/api';
import { formatMoney } from '../lib/format';
import type { DiscountPreview } from '../types/domain';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FREE_SHIPPING_THRESHOLD = Number(import.meta.env.VITE_FREE_SHIPPING_THRESHOLD ?? 2500);
const FLAT_SHIPPING_RATE = Number(import.meta.env.VITE_FLAT_SHIPPING_RATE ?? 300);

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, loading } = useAuth();
  const methodsQuery = useQuery({ queryKey: ['payment-methods'], queryFn: getPaymentMethods });
  const [form, setForm] = useState({ fullName: user?.name ?? '', phone: '', address1: '', city: '', province: '', postalCode: '' });
  const [paymentMethodCode, setPaymentMethodCode] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState<DiscountPreview | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const paymentMethods = methodsQuery.data ?? [];

  useEffect(() => {
    if (!paymentMethodCode && paymentMethods.length) setPaymentMethodCode(paymentMethods[0].code);
  }, [paymentMethods, paymentMethodCode]);

  if (loading) return <div className="page-loader">Loading checkout…</div>;
  if (!user) return <Navigate to="/login" state={{ from: '/checkout' }} replace />;
  if (items.length === 0) return <Navigate to="/collections/all" replace />;

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
  const discountTotal = Number(discount?.discountTotal ?? 0);
  const total = Math.max(0, subtotal + shipping - discountTotal);
  const selectedMethod = paymentMethods.find((method) => method.code === paymentMethodCode);
  const orderItems = items.map((item) => ({ productId: item.product.id, variantId: item.variant?.id ?? null, quantity: item.quantity }));
  const hasPreviewItems = orderItems.some((item) => !UUID_PATTERN.test(item.productId) || (item.variantId != null && !UUID_PATTERN.test(item.variantId)));

  async function applyDiscount() {
    if (!discountCode.trim()) return;
    setDiscountError(''); setCheckingDiscount(true);
    try {
      const result = await validateDiscount({ code: discountCode, items: orderItems });
      setDiscount(result); setDiscountCode(result.code);
    } catch (err) {
      setDiscount(null); setDiscountError(err instanceof Error ? err.message : 'This code could not be applied.');
    } finally { setCheckingDiscount(false); }
  }

  return <section className="checkout-page">
    <div className="checkout-form">
      <p className="eyebrow">Secure checkout</p>
      <h1>Delivery & payment</h1>
      <form onSubmit={async (event) => {
        event.preventDefault(); setError('');
        if (hasPreviewItems) {
          setError('Your cart contains old preview products that are not connected to live inventory. Empty the cart and add the products again from the live store.');
          return;
        }
        setSubmitting(true);
        try {
          const result = await createOrder({ items: orderItems, shippingAddress: form, paymentMethodCode, discountCode: discount?.code ?? null, customerNote: customerNote.trim() || null });
          if (result.payment.checkoutUrl) { window.location.assign(result.payment.checkoutUrl); return; }
          clearCart(); window.location.assign('/account?order=placed');
        } catch (err) { setError(err instanceof Error ? err.message : 'Unable to place the order.'); setSubmitting(false); }
      }}>
        <div className="checkout-section"><div className="checkout-section__heading"><span>01</span><div><strong>Delivery details</strong><p>Where should we send your order?</p></div></div><div className="form-grid"><label className="wide">Full name<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label><label className="wide">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></label><label className="wide">Address<input value={form.address1} onChange={(event) => setForm({ ...form, address1: event.target.value })} required /></label><label>City<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required /></label><label>Province<input value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} required /></label><label>Postal code<input value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} /></label></div></div>

        <div className="checkout-section"><div className="checkout-section__heading"><span>02</span><div><strong>Payment method</strong><p>Choose from the methods currently enabled by the store.</p></div></div>{methodsQuery.isLoading ? <p>Loading payment methods…</p> : <div className="store-payment-options">{paymentMethods.map((method) => <label key={method.id} className={`store-payment-option ${paymentMethodCode === method.code ? 'active' : ''}`}><input type="radio" name="paymentMethod" value={method.code} checked={paymentMethodCode === method.code} onChange={() => setPaymentMethodCode(method.code)} /><span className="store-payment-option__check">{paymentMethodCode === method.code ? <Check size={14} /> : null}</span><span><strong>{method.displayName}</strong><small>{method.description}</small>{method.instructions ? <em>{method.instructions}</em> : null}</span></label>)}</div>}</div>

        <div className="checkout-section"><div className="checkout-section__heading"><span>03</span><div><strong>Discount & notes</strong><p>Apply a valid promotion and add any delivery guidance.</p></div></div><div className="discount-entry"><div><BadgePercent size={17} /><input value={discountCode} onChange={(event) => { setDiscountCode(event.target.value.toUpperCase()); if (discount) setDiscount(null); }} placeholder="Discount code" /></div><button type="button" onClick={() => void applyDiscount()} disabled={checkingDiscount || !discountCode.trim()}>{checkingDiscount ? 'Checking…' : 'Apply'}</button></div>{discount ? <p className="discount-success"><Check size={15} /> {discount.name} applied — you save {formatMoney(discount.discountTotal)}</p> : null}{discountError ? <p className="form-error">{discountError}</p> : null}<label className="checkout-note">Order note<textarea rows={3} value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} placeholder="Optional delivery or order note" /></label></div>

        <div className="payment-placeholder payment-provider-card"><ShieldCheck size={19} /><div><strong>{selectedMethod?.requiresOnlinePayment ? 'Verified online payment' : 'Server-validated order'}</strong><p>Prices, discounts and inventory are recalculated by our server before your order is accepted.</p></div></div>
        {methodsQuery.error ? <p className="form-error">Unable to load payment methods. Please refresh.</p> : null}
        {error && <div className="form-error"><p>{error}</p>{hasPreviewItems ? <button type="button" className="text-button" onClick={() => { clearCart(); window.location.assign('/collections/all'); }}>Empty preview cart and browse live products</button> : null}</div>}
        <button className="button dark full" disabled={submitting || !paymentMethodCode}>{submitting ? 'Placing order…' : `${selectedMethod?.requiresOnlinePayment ? 'Continue to secure payment' : 'Place order'} · ${formatMoney(total)}`}</button>
      </form>
    </div>
    <aside className="checkout-summary"><h2>Your selection</h2>{items.map((item) => <div className="summary-line" key={item.key}><img src={item.product.images[0]} alt={item.product.name} /><div><strong>{item.product.name}</strong><span>{[item.variant?.size, item.variant?.color].filter(Boolean).join(' / ')}</span><span>Qty {item.quantity}</span></div><b>{formatMoney(Number(item.variant?.price ?? item.product.price) * item.quantity)}</b></div>)}<div className="summary-totals"><div><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div><div><span>Delivery</span><span>{shipping ? formatMoney(shipping) : 'Complimentary'}</span></div>{discountTotal > 0 ? <div className="discount-total"><span>Discount {discount?.code ? `(${discount.code})` : ''}</span><span>-{formatMoney(discountTotal)}</span></div> : null}<div className="grand-total"><span>Total</span><strong>{formatMoney(total)}</strong></div></div></aside>
  </section>;
}
