import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { formatMoney, productPath } from '../lib/format';

export function CartDrawer() {
  const { items, isOpen, closeCart, subtotal, updateQuantity, removeItem } = useCart();
  return (
    <>
      <button className={`drawer-backdrop ${isOpen ? 'show' : ''}`} onClick={closeCart} aria-label="Close cart" />
      <aside className={`cart-drawer ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <div className="drawer-head"><div><p className="eyebrow">Your selection</p><h2>Shopping bag</h2></div><button className="icon-button" onClick={closeCart}><X /></button></div>
        <div className="drawer-content">
          {items.length === 0 ? (
            <div className="empty-state"><ShoppingBag size={34} strokeWidth={1.2} /><h3>Your bag is empty</h3><p>Explore audio, charging and everyday tech essentials.</p><Link to="/collections/all" className="button dark" onClick={closeCart}>Shop all</Link></div>
          ) : items.map((item) => (
            <div className="cart-line" key={item.key}>
              <Link to={productPath(item.product)} onClick={closeCart}><img src={item.variant?.image || item.product.images[0]} alt={item.product.name} /></Link>
              <div className="cart-line-main">
                <div><Link to={productPath(item.product)} onClick={closeCart}>{item.product.name}</Link><p>{[item.variant?.size, item.variant?.color].filter(Boolean).join(' / ') || item.product.color}</p></div>
                <div className="cart-line-bottom">
                  <div className="quantity-control"><button onClick={() => updateQuantity(item.key, item.quantity - 1)}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.key, item.quantity + 1)}><Plus size={13} /></button></div>
                  <span>{formatMoney((Number(item.variant?.price ?? item.product.price)) * item.quantity)}</span>
                </div>
              </div>
              <button className="remove-line" onClick={() => removeItem(item.key)} aria-label="Remove"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        {items.length > 0 && <div className="drawer-footer"><div className="subtotal"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div><p>Shipping and taxes are calculated at checkout.</p><Link to="/checkout" className="button dark full" onClick={closeCart}>Continue to checkout</Link><Link to="/cart" className="text-link" onClick={closeCart}>View bag</Link></div>}
      </aside>
    </>
  );
}
