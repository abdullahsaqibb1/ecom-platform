import { useQueries } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EarbudsHeroVisual } from '../components/EarbudsHeroVisual';
import { ProductCard } from '../components/ProductCard';
import { getProducts } from '../lib/api';
import { useStorefrontConfig } from '../lib/storefront-config';
import type { Product } from '../types/domain';

export function HomePage() {
  const { settings } = useStorefrontConfig();
  const home = settings.homepage;
  const sectionQueries = useQueries({ queries: home.productSections.map((section) => ({
    queryKey: ['products', 'home-section', section.collectionSlug, section.limit],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(section.limit) });
      if (section.collectionSlug === 'new') params.set('sort', 'newest');
      else if (section.collectionSlug !== 'all') params.set('collection', section.collectionSlug);
      return getProducts(params);
    },
  })) });
  const hero = home.hero;
  return <>
    <section className={`hero-editorial tech-editorial-hero ${hero.visualType === 'IMAGE' ? 'hero-editorial--image' : ''}`} style={hero.visualType === 'IMAGE' && hero.imageUrl ? { backgroundImage: `url(${hero.imageUrl})` } : undefined}>
      {hero.visualType === 'EARBUDS_ANIMATION' ? <><div className="tech-editorial-backdrop" /><EarbudsHeroVisual /></> : null}<div className="hero-shade" /><div className="hero-copy"><p className="eyebrow">{hero.eyebrow}</p><h1>{hero.heading.split('\n').map((line, index) => <span key={`${line}-${index}`}>{line}{index < hero.heading.split('\n').length - 1 ? <br /> : null}</span>)}</h1>{hero.body ? <p className="hero-body">{hero.body}</p> : null}{hero.ctaLabel && hero.ctaUrl ? <Link to={hero.ctaUrl} className="hero-link">{hero.ctaLabel} <ArrowRight size={18} /></Link> : null}</div>
    </section>

    {home.productSections.map((section, index) => <ProductSection key={`${section.title}-${index}`} title={section.title} link={section.collectionSlug === 'all' ? '/collections/all' : section.collectionSlug === 'new' ? '/collections/new' : `/collections/${section.collectionSlug}`} products={sectionQueries[index]?.data?.items ?? []} />)}

    {home.editorialPanels.length ? <section className="split-editorial">{home.editorialPanels.map((panel, index) => <Link to={panel.ctaUrl || '/collections/all'} className="editorial-panel" key={`${panel.heading}-${index}`}>{panel.imageUrl ? <img src={panel.imageUrl} alt={panel.heading} /> : <span className="editorial-placeholder" />}<div><p>{panel.eyebrow}</p><h2>{panel.heading}</h2><span>{panel.ctaLabel || 'Explore'} →</span></div></Link>)}</section> : null}

    <section className="brand-statement"><p className="eyebrow">{home.statement.eyebrow}</p><h2>{home.statement.heading}</h2>{home.statement.ctaLabel && home.statement.ctaUrl ? <Link to={home.statement.ctaUrl}>{home.statement.ctaLabel} <ArrowRight size={17} /></Link> : null}</section>

    {home.mosaic.length ? <section className="category-mosaic">{home.mosaic.map((item, index) => <Link to={item.href} key={`${item.label}-${index}`}>{item.imageUrl ? <img src={item.imageUrl} alt={item.label} /> : <span className="mosaic-placeholder" />}<span>{item.label}</span></Link>)}</section> : null}
  </>;
}

function ProductSection({ title, link, products }: { title: string; link: string; products: Product[] }) {
  return <section className="product-section"><div className="section-head"><h2>{title}</h2><Link to={link}>View all <ArrowRight size={16} /></Link></div>{products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="home-products-empty">Add products to this collection from the admin dashboard.</div>}</section>;
}
