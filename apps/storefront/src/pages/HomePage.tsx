import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getProducts } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import type { Product } from '../types/domain';

export function HomePage() {
  const { data } = useQuery({ queryKey: ['products', 'home'], queryFn: () => getProducts() });
  const products = data?.items ?? [];
  return (
    <>
      <section className="hero-editorial">
        <img src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=2200&q=90" alt="Editorial fashion collection" />
        <div className="hero-shade" />
        <div className="hero-copy"><p className="eyebrow">Spring / Summer 2026</p><h1>Quiet forms.<br />Confident movement.</h1><Link to="/collections/new" className="hero-link">Discover the edit <ArrowRight size={18} /></Link></div>
      </section>

      <ProductSection title="New arrivals" link="/collections/new" products={products.slice(0, 4)} />

      <section className="split-editorial">
        <Link to="/collections/women" className="editorial-panel"><img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=88" alt="Women's collection" /><div><p>Women</p><h2>Soft tailoring for warmer days.</h2><span>Shop the collection →</span></div></Link>
        <Link to="/collections/men" className="editorial-panel"><img src="https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1400&q=88" alt="Men's collection" /><div><p>Men</p><h2>Everyday pieces, precisely considered.</h2><span>Shop the collection →</span></div></Link>
      </section>

      <ProductSection title="Wearing now" link="/collections/all" products={products.slice(4, 8)} />

      <section className="brand-statement"><p className="eyebrow">Our perspective</p><h2>Clothing should feel relevant beyond one season—simple enough to repeat, distinct enough to remember.</h2><Link to="/pages/about">Read our story <ArrowRight size={17} /></Link></section>

      <section className="category-mosaic">
        <Link to="/collections/footwear"><img src="https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=88" alt="Footwear" /><span>Footwear</span></Link>
        <Link to="/collections/accessories"><img src="https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=1200&q=88" alt="Accessories" /><span>Accessories</span></Link>
        <Link to="/collections/all"><img src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=88" alt="The full edit" /><span>The full edit</span></Link>
      </section>
    </>
  );
}

function ProductSection({ title, link, products }: { title: string; link: string; products: Product[] }) {
  return <section className="product-section"><div className="section-head"><h2>{title}</h2><Link to={link}>View all <ArrowRight size={16} /></Link></div><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}
