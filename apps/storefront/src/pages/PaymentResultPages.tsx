import { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export function PaymentSuccessPage() {
  const { clearCart, items } = useCart();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orderId = params.get('order');
  const mode = params.get('mode');
  const isOrderOnly = mode === 'order';

  useEffect(() => {
    if (items.length) clearCart();
  }, [items.length, clearCart]);

  return <section className="payment-result-page"><div className="payment-result-card"><CheckCircle2 size={42} /><p className="eyebrow">{isOrderOnly ? 'Order confirmed' : 'Payment submitted'}</p><h1>Thank you</h1><p>{isOrderOnly ? 'Your order has been received. We will use the email you entered at checkout for order updates.' : 'Safepay is confirming your payment securely. We will email you when the verified payment notification reaches us.'}</p>{orderId ? <small>Order reference: {orderId.slice(-8).toUpperCase()}</small> : null}<div>{user ? <Link className="button dark" to="/account">View order status</Link> : <Link className="button dark" to="/collections/all">Continue shopping</Link>}<Link className="text-link" to="/">Return home</Link></div></div></section>;
}

export function PaymentCancelledPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orderId = params.get('order');
  return <section className="payment-result-page"><div className="payment-result-card is-cancelled"><XCircle size={42} /><p className="eyebrow">Payment not completed</p><h1>Your bag is still here</h1><p>No payment confirmation was received. Return to checkout when you are ready.</p>{orderId ? <small>Order reference: {orderId.slice(-8).toUpperCase()}</small> : null}<div><Link className="button dark" to="/checkout">Return to checkout</Link>{user ? <Link className="text-link" to="/account">View account</Link> : <Link className="text-link" to="/collections/all">Continue shopping</Link>}</div></div></section>;
}
