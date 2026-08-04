import { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

export function PaymentSuccessPage() {
  const { clearCart, items } = useCart();
  const [params] = useSearchParams();
  const orderId = params.get('order');

  useEffect(() => {
    if (items.length) clearCart();
  }, [items.length, clearCart]);

  return <section className="payment-result-page"><div className="payment-result-card"><CheckCircle2 size={42} /><p className="eyebrow">Payment submitted</p><h1>Thank you</h1><p>Safepay is confirming your payment securely. Your account will update automatically when the verified payment notification reaches us.</p>{orderId ? <small>Order reference: {orderId.slice(-8).toUpperCase()}</small> : null}<div><Link className="button dark" to="/account">View order status</Link><Link className="text-link" to="/collections/all">Continue shopping</Link></div></div></section>;
}

export function PaymentCancelledPage() {
  const [params] = useSearchParams();
  const orderId = params.get('order');
  return <section className="payment-result-page"><div className="payment-result-card is-cancelled"><XCircle size={42} /><p className="eyebrow">Payment not completed</p><h1>Your bag is still here</h1><p>No payment confirmation was received. Return to checkout when you are ready, or review the pending order in your account.</p>{orderId ? <small>Order reference: {orderId.slice(-8).toUpperCase()}</small> : null}<div><Link className="button dark" to="/checkout">Return to checkout</Link><Link className="text-link" to="/account">View account</Link></div></div></section>;
}
