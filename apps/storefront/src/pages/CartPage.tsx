import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { formatMoney, productPath } from '../lib/format';

export function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  return <section className="cart-page"><p className="eyebrow">Your selection</p><h1>Shopping bag</h1>{items.length === 0 ? <div className="empty-collection"><h2>Your bag is empty</h2><Link className="button dark" to="/collections/all">Continue shopping</Link></div> : <div className="cart-page-layout"><div>{items.map((item) => <article className="cart-page-line" key={item.key}><Link to={productPath(item.product)}><img src={item.product.images[0]} alt={item.product.name} /></Link><div><Link to={productPath(item.product)}>{item.product.name}</Link><p>{[item.variant?.color, item.variant?.size].filter(Boolean).join(' / ')}</p><div className="quantity-control"><button onClick={() => updateQuantity(item.key, item.quantity - 1)}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.key, item.quantity + 1)}><Plus size={13} /></button></div></div><strong>{formatMoney(Number(item.variant?.price ?? item.product.price) * item.quantity)}</strong><button onClick={() => removeItem(item.key)} className="remove-line"><Trash2 size={16} /></button></article>)}</div><aside><div><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div><p>Delivery and taxes are calculated at checkout.</p><Link to="/checkout" className="button dark full">Continue to checkout</Link></aside></div>}</section>;
}
