import { ChevronDown, Minus, Plus, Truck } from 'lucide-react';
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
          <h1>{product.name}</h1>
          <p className="product-price">{formatMoney(selectedVariant?.price ?? product.price)}</p>

          {(selectedVariant?.color || product.color) && <div className="option-block"><span>Finish — {selectedVariant?.color || product.color}</span><button className="color-swatch active" aria-label={selectedVariant?.color || product.color} style={{ background: colorValue(selectedVariant?.color || product.color || '') }} /></div>}

          {variants.length > 0 && <div className="option-block"><div className="option-title"><span>Configuration</span></div><div className="size-options">{variants.map((variant) => <button key={variant.id} disabled={variant.stock <= 0} className={(selectedVariant?.id === variant.id ? 'active ' : '') + (variant.stock <= 0 ? 'sold-out' : '')} onClick={() => setSelectedVariantId(variant.id)}>{variant.size || variant.color || 'Standard'}</button>)}</div></div>}

          <div className="buy-row"><div className="quantity-control large"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={14} /></button><span>{quantity}</span><button onClick={() => setQuantity(quantity + 1)}><Plus size={14} /></button></div><button className="button dark grow" disabled={(selectedVariant?.stock ?? product.stock) <= 0} onClick={() => addItem(product, selectedVariant, quantity)}>{(selectedVariant?.stock ?? product.stock) <= 0 ? 'Sold out' : 'Add to bag'}</button></div>

          <div className="shipping-note"><Truck size={18} /><div><strong>Complimentary delivery above Rs. 2,500</strong><span>Estimated dispatch within 1–2 working days.</span></div></div>

          <Accordion title="Overview" defaultOpen><p>{product.description}</p>{selectedVariant?.sku && <p><strong>SKU:</strong> {selectedVariant.sku}</p>}</Accordion>
          <Accordion title="Compatibility & specifications"><p>{product.material || 'See the product configuration and connector details above.'}</p>{product.tags?.length ? <ul>{product.tags.map((item) => <li key={item}>{item}</li>)}</ul> : null}</Accordion>
          <Accordion title="Highlights & what is included"><ul>{product.careInstructions?.length ? product.careInstructions.map((item) => <li key={item}>{item}</li>) : <><li>Product and selected accessories</li><li>Charging or connection cable where stated</li><li>Basic setup information</li></>}</ul></Accordion>
          <Accordion title="Delivery, returns & warranty"><p>Shipping is calculated at checkout. Unused items may be returned within the configured return window. Warranty coverage depends on the product and is shown in the listing or order documentation.</p></Accordion>
        </div>
      </section>
      {relatedProducts.length > 0 && <section className="product-section related"><div className="section-head"><h2>Complete your setup</h2></div><div className="product-grid">{relatedProducts.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
    </>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <div className={`accordion ${open ? 'open' : ''}`}><button onClick={() => setOpen(!open)}><span>{title}</span><ChevronDown size={18} /></button>{open && <div>{children}</div>}</div>;
}

function colorValue(color: string) {
  const values: Record<string, string> = {
    black: '#181818', graphite: '#4a4b4c', silver: '#c6c7c9', white: '#f4f3ef',
    'pearl white': '#f2f1ec', 'midnight black': '#17181a', 'matte black': '#232426',
    'space grey': '#777a7d', blue: '#73869b', navy: '#283644', red: '#a64b45',
  };
  return values[color.toLowerCase()] ?? '#d2d2d2';
}
