import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem, Product, ProductVariant } from '../types/domain';
import { cartStorage } from '../lib/storage';
import { toNumber } from '../lib/format';

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  itemCount: number;
  subtotal: number;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEMO_FALLBACK = import.meta.env.VITE_ENABLE_DEMO_FALLBACK === 'true';

function isLiveCartItem(item: CartItem) {
  return UUID_PATTERN.test(item.product.id) && (!item.variant?.id || UUID_PATTERN.test(item.variant.id));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = JSON.parse(cartStorage.get() ?? '[]') as CartItem[];
      // Preview products use readable IDs such as `tech-1`; the live API accepts UUIDs only.
      // Remove stale preview-cart entries when demo mode is disabled in production.
      return DEMO_FALLBACK ? stored : stored.filter(isLiveCartItem);
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => { cartStorage.set(JSON.stringify(items)); }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    isOpen,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + toNumber(item.variant?.price ?? item.product.price) * item.quantity, 0),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem: (product, variant, quantity = 1) => {
      const key = `${product.id}:${variant?.id ?? 'default'}`;
      setItems((current) => {
        const existing = current.find((item) => item.key === key);
        if (existing) return current.map((item) => item.key === key ? { ...item, quantity: item.quantity + quantity } : item);
        return [...current, { key, product, variant, quantity }];
      });
      setIsOpen(true);
    },
    updateQuantity: (key, quantity) => setItems((current) => quantity <= 0 ? current.filter((item) => item.key !== key) : current.map((item) => item.key === key ? { ...item, quantity } : item)),
    removeItem: (key) => setItems((current) => current.filter((item) => item.key !== key)),
    clearCart: () => setItems([]),
  }), [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
