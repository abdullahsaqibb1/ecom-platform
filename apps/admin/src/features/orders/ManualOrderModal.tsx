import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ADMIN_API, apiRequest, unwrapEntity, unwrapList } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import type { Order, OrderSource, Product } from '../../types/domain';

interface ManualLine {
  key: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
}

const sourceOptions: Array<{ value: Exclude<OrderSource, 'WEBSITE'>; label: string }> = [
  { value: 'MANUAL', label: 'Manual / other' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'OTHER', label: 'Other' },
];

function newLine(): ManualLine {
  return { key: crypto.randomUUID(), productId: '', variantId: '', quantity: 1, unitPrice: 0 };
}

export function ManualOrderModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: (order: Order) => void }) {
  const productsQuery = useQuery({
    queryKey: ['products', 'manual-order'],
    queryFn: async () => unwrapList<Product>(await apiRequest(`${ADMIN_API.products}?limit=1000`), ['products']).filter((product) => product.status === 'ACTIVE' || product.isActive),
    enabled: isOpen,
  });
  const products = productsQuery.data ?? [];
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [source, setSource] = useState<Exclude<OrderSource, 'WEBSITE'>>('MANUAL');
  const [sourceNote, setSourceNote] = useState('');
  const [paymentMethodCode, setPaymentMethodCode] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState<'UNPAID' | 'PAID'>('PAID');
  const [markDelivered, setMarkDelivered] = useState(true);
  const [shippingTotal, setShippingTotal] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [customerNote, setCustomerNote] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [sendConfirmation, setSendConfirmation] = useState(false);
  const [lines, setLines] = useState<ManualLine[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0), [lines]);
  const total = Math.max(0, subtotal + shippingTotal - discountTotal);

  function reset() {
    setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setSource('MANUAL'); setSourceNote('');
    setPaymentMethodCode('cash'); setPaymentStatus('PAID'); setMarkDelivered(true); setShippingTotal(0); setDiscountTotal(0);
    setCustomerNote(''); setAddress1(''); setCity(''); setProvince(''); setPostalCode(''); setSendConfirmation(false);
    setLines([newLine()]); setError('');
  }

  function close() {
    if (submitting) return;
    reset(); onClose();
  }

  function changeProduct(index: number, productId: string) {
    const product = products.find((item) => item.id === productId);
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? {
      ...line,
      productId,
      variantId: '',
      unitPrice: Number(product?.price ?? 0),
    } : line));
  }

  function changeVariant(index: number, variantId: string) {
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      const product = products.find((item) => item.id === line.productId);
      const variant = product?.variants?.find((item) => item.id === variantId);
      return { ...line, variantId, unitPrice: Number(variant?.price ?? product?.price ?? line.unitPrice) };
    }));
  }

  async function submit() {
    setError('');
    if (!customerName.trim()) return setError('Customer name is required.');
    if (!lines.length || lines.some((line) => !line.productId)) return setError('Choose a product for every order line.');
    for (const line of lines) {
      const product = products.find((item) => item.id === line.productId);
      if (product?.variants?.length && !line.variantId) return setError(`Choose a configuration for ${product.name}.`);
    }
    if (markDelivered && paymentStatus !== 'PAID') return setError('A completed sale must be marked paid.');
    setSubmitting(true);
    try {
      const payload = await apiRequest(ADMIN_API.manualOrder, {
        method: 'POST',
        body: {
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || null,
          customerPhone: customerPhone.trim() || null,
          source,
          sourceNote: sourceNote.trim() || null,
          paymentMethodCode,
          paymentStatus,
          markDelivered,
          shippingTotal,
          discountTotal,
          taxTotal: 0,
          customerNote: customerNote.trim() || null,
          sendConfirmation: Boolean(sendConfirmation && customerEmail.trim()),
          shippingAddress: {
            fullName: customerName.trim(),
            phone: customerPhone.trim(),
            address1: address1.trim(),
            city: city.trim(),
            province: province.trim(),
            postalCode: postalCode.trim(),
          },
          items: lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId || null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        },
      });
      const order = unwrapEntity<Order>(payload, ['order']);
      reset();
      onCreated(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create the manual order.');
    } finally {
      setSubmitting(false);
    }
  }

  return <Modal isOpen={isOpen} onClose={close} title="Add external sale" description="Record a sale made outside the website and deduct the same live inventory." size="lg">
    <div className="manual-order-form">
      <section className="manual-order-section"><div className="manual-order-section__head"><span>01</span><div><strong>Customer & source</strong><p>Record where the sale came from for reporting.</p></div></div><div className="form-grid">
        <label className="field"><span>Customer name</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
        <label className="field"><span>Phone</span><input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="+92…" /></label>
        <label className="field"><span>Email</span><input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Optional" /></label>
        <label className="field"><span>Sale source</span><select value={source} onChange={(event) => setSource(event.target.value as Exclude<OrderSource, 'WEBSITE'>)}>{sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="field field--wide"><span>Source reference / note</span><input value={sourceNote} onChange={(event) => setSourceNote(event.target.value)} placeholder="Facebook Marketplace listing, WhatsApp chat, invoice number…" /></label>
      </div></section>

      <section className="manual-order-section"><div className="manual-order-section__head"><span>02</span><div><strong>Products</strong><p>Inventory is deducted immediately when this order is saved.</p></div></div>
        {productsQuery.isLoading ? <p>Loading inventory…</p> : <div className="manual-lines">{lines.map((line, index) => { const product = products.find((item) => item.id === line.productId); const selectedVariant = product?.variants?.find((item) => item.id === line.variantId); const available = selectedVariant ? selectedVariant.stock : product?.stock; return <div className="manual-line" key={line.key}>
          <label><span>Product</span><select value={line.productId} onChange={(event) => changeProduct(index, event.target.value)}><option value="">Choose product</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stock} stock</option>)}</select></label>
          <label><span>Configuration</span><select value={line.variantId} disabled={!product?.variants?.length} onChange={(event) => changeVariant(index, event.target.value)}><option value="">{product?.variants?.length ? 'Choose configuration' : 'Standard'}</option>{product?.variants?.map((variant) => <option key={variant.id} value={variant.id}>{[variant.size, variant.color, variant.sku].filter(Boolean).join(' · ')} · {variant.stock} stock</option>)}</select></label>
          <label className="manual-line__price"><span>Sale price</span><input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => setLines((current) => current.map((item, lineIndex) => lineIndex === index ? { ...item, unitPrice: Number(event.target.value) } : item))} /></label>
          <div className="manual-line__qty"><span>Qty</span><div><button type="button" onClick={() => setLines((current) => current.map((item, lineIndex) => lineIndex === index ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))}><Minus size={13} /></button><strong>{line.quantity}</strong><button type="button" onClick={() => setLines((current) => current.map((item, lineIndex) => lineIndex === index ? { ...item, quantity: item.quantity + 1 } : item))}><Plus size={13} /></button></div><small>{available == null ? '—' : `${available} available`}</small></div>
          <strong className="manual-line__total">{formatCurrency(line.unitPrice * line.quantity)}</strong>
          <button type="button" className="icon-button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 size={15} /></button>
        </div>; })}</div>}
        <Button type="button" variant="secondary" size="sm" onClick={() => setLines((current) => [...current, newLine()])}><ShoppingBag size={15} /> Add item</Button>
      </section>

      <section className="manual-order-section"><div className="manual-order-section__head"><span>03</span><div><strong>Payment & completion</strong><p>Use the actual amount and state of the external sale.</p></div></div><div className="form-grid">
        <label className="field"><span>Payment method</span><select value={paymentMethodCode} onChange={(event) => setPaymentMethodCode(event.target.value)}><option value="cash">Cash</option><option value="cod">Cash on delivery</option><option value="bank_transfer">Bank transfer</option><option value="easypaisa">Easypaisa</option><option value="jazzcash">JazzCash</option><option value="other">Other</option></select></label>
        <label className="field"><span>Payment status</span><select value={paymentStatus} onChange={(event) => { const next = event.target.value as 'UNPAID' | 'PAID'; setPaymentStatus(next); if (next === 'UNPAID') setMarkDelivered(false); }}><option value="PAID">Paid</option><option value="UNPAID">Unpaid</option></select></label>
        <label className="field"><span>Shipping / delivery charge</span><input type="number" min="0" step="0.01" value={shippingTotal} onChange={(event) => setShippingTotal(Number(event.target.value))} /></label>
        <label className="field"><span>Discount amount</span><input type="number" min="0" step="0.01" value={discountTotal} onChange={(event) => setDiscountTotal(Number(event.target.value))} /></label>
        <label className="checkbox-row field--wide"><input type="checkbox" checked={markDelivered} disabled={paymentStatus !== 'PAID'} onChange={(event) => setMarkDelivered(event.target.checked)} /><span>Sale is already completed / handed to customer</span></label>
        <label className="checkbox-row field--wide"><input type="checkbox" checked={sendConfirmation} disabled={!customerEmail.trim()} onChange={(event) => setSendConfirmation(event.target.checked)} /><span>Send order confirmation email if transactional email is configured</span></label>
      </div></section>

      <section className="manual-order-section"><div className="manual-order-section__head"><span>04</span><div><strong>Delivery details</strong><p>Optional for walk-in and already-completed sales.</p></div></div><div className="form-grid">
        <label className="field field--wide"><span>Address</span><input value={address1} onChange={(event) => setAddress1(event.target.value)} /></label><label className="field"><span>City</span><input value={city} onChange={(event) => setCity(event.target.value)} /></label><label className="field"><span>Province</span><input value={province} onChange={(event) => setProvince(event.target.value)} /></label><label className="field"><span>Postal code</span><input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} /></label><label className="field field--wide"><span>Internal/order note</span><textarea rows={3} value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} /></label>
      </div></section>

      <div className="manual-order-summary"><div><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div><div><span>Shipping</span><strong>{formatCurrency(shippingTotal)}</strong></div><div><span>Discount</span><strong>-{formatCurrency(discountTotal)}</strong></div><div className="manual-order-summary__total"><span>Order total</span><strong>{formatCurrency(total)}</strong></div></div>
      {error ? <div className="form-alert">{error}</div> : null}
      <div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button isLoading={submitting} onClick={() => void submit()}>Create external order</Button></div>
    </div>
  </Modal>;
}
