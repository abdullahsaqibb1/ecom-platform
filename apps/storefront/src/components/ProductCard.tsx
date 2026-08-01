import { Eye, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../types/domain';
import { formatMoney, productPath } from '../lib/format';
import { useCart } from '../contexts/CartContext';

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addItem } = useCart();
  const variant = product.variants?.find((item) => item.stock > 0);
  return (
    <article className={`product-card ${compact ? 'compact' : ''}`}>
      <Link to={productPath(product)} className="product-image-wrap" aria-label={product.name}>
        <img src={product.images[0]} alt={product.name} className="product-image primary" />
        {product.images[1] && <img src={product.images[1]} alt="" className="product-image secondary" />}
        <span className="product-quick"><Eye size={15} /> View</span>
      </Link>
      <div className="product-card-body">
        <div>
          <Link to={productPath(product)} className="product-name">{product.name}</Link>
          <p className="product-meta">{product.color || product.category?.name}</p>
        </div>
        <div className="product-card-foot">
          <span>{formatMoney(product.price)}</span>
          <button type="button" className="icon-button" onClick={() => addItem(product, variant)} disabled={product.stock <= 0} aria-label={`Add ${product.name} to cart`}><Plus size={17} /></button>
        </div>
      </div>
    </article>
  );
}
