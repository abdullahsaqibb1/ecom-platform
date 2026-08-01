import { SlidersHorizontal, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getCategories, getProducts } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { toNumber } from '../lib/format';

export function CollectionPage() {
  const { slug = 'all' } = useParams();
  const [searchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState('featured');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const params = useMemo(() => {
    const next = new URLSearchParams();
    if (slug !== 'all') next.set('category', slug);
    if (searchParams.get('search')) next.set('search', searchParams.get('search')!);
    return next;
  }, [slug, searchParams]);
  const { data, isLoading } = useQuery({ queryKey: ['products', params.toString()], queryFn: () => getProducts(params) });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  useEffect(() => { document.body.style.overflow = filtersOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [filtersOpen]);

  const products = useMemo(() => {
    let result = [...(data?.items ?? [])];
    if (size) result = result.filter((product) => product.variants?.some((variant) => variant.size === size && variant.stock > 0));
    if (color) result = result.filter((product) => (product.color ?? '').toLowerCase() === color.toLowerCase() || product.variants?.some((variant) => variant.color?.toLowerCase() === color.toLowerCase()));
    if (sort === 'price-asc') result.sort((a, b) => toNumber(a.price) - toNumber(b.price));
    if (sort === 'price-desc') result.sort((a, b) => toNumber(b.price) - toNumber(a.price));
    if (sort === 'newest') result.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
    return result;
  }, [data, size, color, sort]);

  const title = searchParams.get('search') ? `Search: “${searchParams.get('search')}”` : slug === 'all' ? 'The full edit' : categories.find((category) => category.slug === slug)?.name ?? slug.replace(/-/g, ' ');

  return (
    <section className="collection-page">
      <div className="collection-intro"><p className="eyebrow">Collection</p><h1>{title}</h1><p>A considered selection of modern wardrobe pieces, designed to work together and live beyond the season.</p></div>
      <div className="collection-toolbar"><button onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={17} /> Filter</button><span>{products.length} pieces</span><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></div>
      {isLoading ? <div className="loading-grid">Loading the collection…</div> : products.length ? <div className="collection-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-collection"><h2>No pieces found</h2><p>Try removing a filter or choosing another collection.</p></div>}
      <button className={`drawer-backdrop ${filtersOpen ? 'show' : ''}`} onClick={() => setFiltersOpen(false)} />
      <aside className={`filter-drawer ${filtersOpen ? 'open' : ''}`}><div className="drawer-head"><div><p className="eyebrow">Refine</p><h2>Filters</h2></div><button className="icon-button" onClick={() => setFiltersOpen(false)}><X /></button></div><FilterGroup title="Size" values={['XS','S','M','L','XL','XXL','36','37','38','39','40','41','42','43','44','45']} value={size} onChange={setSize} /><FilterGroup title="Color" values={['Black','Ivory','Oat','Stone','Olive','Coffee','Espresso','Off White']} value={color} onChange={setColor} /><div className="filter-actions"><button className="button dark full" onClick={() => setFiltersOpen(false)}>Show {products.length} pieces</button><button className="text-link" onClick={() => { setSize(''); setColor(''); }}>Clear filters</button></div></aside>
    </section>
  );
}

function FilterGroup({ title, values, value, onChange }: { title: string; values: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="filter-group"><h3>{title}</h3><div className="filter-pills">{values.map((item) => <button key={item} className={value === item ? 'active' : ''} onClick={() => onChange(value === item ? '' : item)}>{item}</button>)}</div></div>;
}
