import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getProducts } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { EarbudsHeroVisual } from '../components/EarbudsHeroVisual';
import type { Product } from '../types/domain';

export function HomePage() {
  const { data } = useQuery({ queryKey: ['products', 'home'], queryFn: () => getProducts() });
  const products = data?.items ?? [];

  return (
    <>
      <section className="hero-editorial tech-editorial-hero">
        <div className="tech-editorial-backdrop" />
        <EarbudsHeroVisual />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow">Everyday audio / power / connection</p>
          <h1>Better sound.<br />Cleaner connections.</h1>
          <Link to="/collections/new" className="hero-link">Discover new tech <ArrowRight size={18} /></Link>
        </div>
      </section>

      <ProductSection title="New arrivals" link="/collections/new" products={products.slice(0, 4)} />

      <section className="split-editorial">
        <Link to="/collections/audio" className="editorial-panel">
          <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1500&q=90" alt="Premium wireless headphones" />
          <div><p>Audio</p><h2>Sound, reduced to what matters.</h2><span>Explore audio →</span></div>
        </Link>
        <Link to="/collections/charging" className="editorial-panel">
          <img src="https://images.unsplash.com/photo-1615526675159-e248c3021d3f?auto=format&fit=crop&w=1500&q=90" alt="Compact charging accessories" />
          <div><p>Charging</p><h2>Power, cleanly considered.</h2><span>Explore charging →</span></div>
        </Link>
      </section>

      <ProductSection title="Everyday upgrades" link="/collections/all" products={products.slice(4, 8)} />

      <section className="brand-statement">
        <p className="eyebrow">Our perspective</p>
        <h2>Technology should feel useful beyond the unboxing—simple enough to live with, reliable enough to reach for every day.</h2>
        <Link to="/pages/about">Read our approach <ArrowRight size={17} /></Link>
      </section>

      <section className="category-mosaic">
        <Link to="/collections/earbuds"><img src="https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=90" alt="Wireless earbuds" /><span>Earbuds</span></Link>
        <Link to="/collections/cables"><img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=90" alt="Charging cables" /><span>Cables</span></Link>
        <Link to="/collections/accessories"><img src="https://images.unsplash.com/photo-1622445275576-721325763afe?auto=format&fit=crop&w=1200&q=90" alt="Tech accessories" /><span>Accessories</span></Link>
      </section>
    </>
  );
}

function ProductSection({ title, link, products }: { title: string; link: string; products: Product[] }) {
  return <section className="product-section"><div className="section-head"><h2>{title}</h2><Link to={link}>View all <ArrowRight size={16} /></Link></div><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}
