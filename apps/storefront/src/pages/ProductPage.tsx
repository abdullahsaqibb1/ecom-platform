import { ChevronDown, Minus, Plus, Ruler, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../contexts/CartContext';
import { formatMoney } from '../lib/format';
import { getProduct, getProducts } from '../lib/api';
import type { ProductVariant } from '../types/domain';

export function ProductPage() {
  const { idOrSlug = '' } = useParams();
  const { data: product, isLoading, error } = useQuery({ queryKey: ['product', idOrSlug], queryFn: () => getProduct(idOrSlug) });
  const { data: related } = useQuery({ queryKey: ['products', 'related'], queryFn: () => getProducts() });
  const { addItem } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const selectedVariant = useMemo<ProductVariant | undefined>(() => product?.variants?.find((item) => item.id === selectedVariantId) ?? product?.variants?.find((item) => item.stock > 0), [product, selectedVariantId]);

  if (isLoading) return <div className="page-loader">Loading product…</div>;
  if (error || !product) return <div className="page-loader">This product could not be found.</div>;

  const variants = product.variants ?? [];
  const relatedProducts = related?.items.filter((item) => item.id !== product.id).slice(0, 4) ?? [];
  return (
    <>
      <section className="product-page">
        <div className="product-gallery">
          <div className="gallery-thumbs">{product.images.map((image, index) => <button key={image} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)}><img src={image} alt="" /></button>)}</div>
          <div className="gallery-main"><img src={product.images[activeImage] || product.images[0]} alt={product.name} /></div>
        </div>
        <div className="product-info">
          <p className="breadcrumb"><Link to="/">Home</Link> / <Link to={`/collections/${product.category?.slug ?? 'all'}`}>{product.category?.name ?? 'Collection'}</Link></p>
          <h1>{product.name}</h1><p className="product-price">{formatMoney(selectedVariant?.price ?? product.price)}</p>
          {product.color && <div className="option-block"><span>Color — {selectedVariant?.color || product.color}</span><button className="color-swatch active" aria-label={product.color} style={{ background: colorValue(product.color) }} /></div>}
          {variants.length > 0 && <div className="option-block"><div className="option-title"><span>Size</span><button onClick={() => setSizeChartOpen(true)}><Ruler size={15} /> Size guide</button></div><div className="size-options">{variants.map((variant) => <button key={variant.id} disabled={variant.stock <= 0} className={(selectedVariant?.id === variant.id ? 'active ' : '') + (variant.stock <= 0 ? 'sold-out' : '')} onClick={() => setSelectedVariantId(variant.id)}>{variant.size ?? 'Universal'}</button>)}</div></div>}
          <div className="buy-row"><div className="quantity-control large"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={14} /></button><span>{quantity}</span><button onClick={() => setQuantity(quantity + 1)}><Plus size={14} /></button></div><button className="button dark grow" disabled={(selectedVariant?.stock ?? product.stock) <= 0} onClick={() => addItem(product, selectedVariant, quantity)}>{(selectedVariant?.stock ?? product.stock) <= 0 ? 'Sold out' : 'Add to bag'}</button></div>
          <div className="shipping-note"><Truck size={18} /><div><strong>Complimentary delivery above Rs. 2,500</strong><span>Estimated dispatch within 1–2 working days.</span></div></div>
          <Accordion title="Description" defaultOpen><p>{product.description}</p>{product.material && <p><strong>Material:</strong> {product.material}</p>}</Accordion>
          <Accordion title="Care"><ul>{product.careInstructions?.length ? product.careInstructions.map((item) => <li key={item}>{item}</li>) : <><li>Wash with similar colors.</li><li>Use a gentle cycle and mild detergent.</li><li>Iron at a low to medium temperature.</li></>}</ul></Accordion>
          <Accordion title="Delivery & returns"><p>Shipping is calculated at checkout. Unworn items may be returned or exchanged within the configured return window.</p></Accordion>
        </div>
      </section>
      {relatedProducts.length > 0 && <section className="product-section related"><div className="section-head"><h2>You may also like</h2></div><div className="product-grid">{relatedProducts.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
      {sizeChartOpen && <div className="modal-shell"><button className="modal-backdrop" onClick={() => setSizeChartOpen(false)} /><div className="size-modal"><button className="modal-close" onClick={() => setSizeChartOpen(false)}>×</button><p className="eyebrow">Measurements</p><h2>Size guide</h2><table><thead><tr><th>Size</th><th>Chest</th><th>Waist</th><th>Hip</th></tr></thead><tbody>{[['XS','82','64','90'],['S','86','68','94'],['M','90','72','98'],['L','96','78','104'],['XL','102','84','110']].map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell} cm</td>)}</tr>)}</tbody></table><p>Use this chart as a starting point. Product-specific measurements can be managed per product later.</p></div></div>}
    </>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <div className={`accordion ${open ? 'open' : ''}`}><button onClick={() => setOpen(!open)}><span>{title}</span><ChevronDown size={18} /></button>{open && <div>{children}</div>}</div>;
}

function colorValue(color: string) {
  const values: Record<string, string> = { black: '#181818', ivory: '#f3eee3', oat: '#cfc1a4', stone: '#b2aa9d', olive: '#66705a', coffee: '#6f4b38', espresso: '#3b2821', 'off white': '#f4f2ed' };
  return values[color.toLowerCase()] ?? '#d2d2d2';
}
