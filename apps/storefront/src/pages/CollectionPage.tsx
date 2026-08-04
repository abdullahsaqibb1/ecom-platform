import { SlidersHorizontal, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getCategories, getCollections, getProducts } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { toNumber } from '../lib/format';

export function CollectionPage() {
  const { slug = 'all' } = useParams();
  const [searchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState('featured');
  const [configuration, setConfiguration] = useState('');
  const [finish, setFinish] = useState('');
  const [compatibility, setCompatibility] = useState('');
  const [brand, setBrand] = useState('');

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const { data: collections = [] } = useQuery({ queryKey: ['collections'], queryFn: getCollections });
  const matchedCollection = collections.find((collection) => collection.slug === slug);
  const matchedCategory = categories.find((category) => category.slug === slug);

  const params = useMemo(() => {
    const next = new URLSearchParams();
    if (slug !== 'all') {
      if (matchedCollection) next.set('collection', slug);
      else next.set('category', slug);
    }
    if (searchParams.get('search')) next.set('search', searchParams.get('search')!);
    next.set('limit', '100');
    return next;
  }, [slug, searchParams, matchedCollection]);

  const { data, isLoading } = useQuery({ queryKey: ['products', params.toString()], queryFn: () => getProducts(params) });

  useEffect(() => { document.body.style.overflow = filtersOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [filtersOpen]);
  useEffect(() => { setConfiguration(''); setFinish(''); setCompatibility(''); setBrand(''); }, [slug]);

  const availableConfigurations = useMemo(() => Array.from(new Set((data?.items ?? []).flatMap((product) => product.variants?.map((variant) => variant.size).filter(Boolean) ?? []))).sort() as string[], [data]);
  const availableFinishes = useMemo(() => Array.from(new Set((data?.items ?? []).flatMap((product) => [product.color, ...(product.variants?.map((variant) => variant.color) ?? [])].filter(Boolean)))).sort() as string[], [data]);
  const availableCompatibility = useMemo(() => Array.from(new Set((data?.items ?? []).flatMap((product) => [...(product.compatibility ?? []), ...(product.variants?.flatMap((variant) => variant.compatibility ?? []) ?? [])]).filter(Boolean))).sort(), [data]);
  const availableBrands = useMemo(() => Array.from(new Set((data?.items ?? []).map((product) => product.brand).filter(Boolean))).sort() as string[], [data]);

  const products = useMemo(() => {
    let result = [...(data?.items ?? [])];
    if (configuration) result = result.filter((product) => product.variants?.some((variant) => variant.size === configuration && variant.stock > 0));
    if (finish) result = result.filter((product) => (product.color ?? '').toLowerCase() === finish.toLowerCase() || product.variants?.some((variant) => variant.color?.toLowerCase() === finish.toLowerCase()));
    if (compatibility) result = result.filter((product) => product.compatibility?.includes(compatibility) || product.variants?.some((variant) => variant.compatibility?.includes(compatibility)));
    if (brand) result = result.filter((product) => product.brand === brand);
    if (sort === 'price-asc') result.sort((a, b) => toNumber(a.price) - toNumber(b.price));
    if (sort === 'price-desc') result.sort((a, b) => toNumber(b.price) - toNumber(a.price));
    if (sort === 'newest') result.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
    return result;
  }, [data, configuration, finish, compatibility, brand, sort]);

  const searchTitle = searchParams.get('search');
  const title = searchTitle ? `Search: “${searchTitle}”` : slug === 'all' ? 'The full collection' : matchedCollection?.name ?? matchedCategory?.name ?? slug.replace(/-/g, ' ');
  const description = matchedCollection?.description ?? matchedCategory?.description ?? 'A considered selection of audio, charging and connection essentials chosen for clear compatibility and dependable everyday use.';
  const eyebrow = matchedCollection ? 'Curated collection' : matchedCategory ? 'Category' : 'Products';
  const activeFilterCount = [configuration, finish, compatibility, brand].filter(Boolean).length;

  return (
    <section className="collection-page">
      <div className="collection-intro collection-intro--tech">
        <div>{matchedCollection?.image || matchedCategory?.image ? <img src={matchedCollection?.image || matchedCategory?.image || ''} alt="" /> : null}</div>
        <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      </div>
      <div className="collection-toolbar"><button onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={17} /> Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}</button><span>{products.length} products</span><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></div>
      {isLoading ? <div className="loading-grid">Loading the collection…</div> : products.length ? <div className="collection-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-collection"><h2>No products found</h2><p>Try removing a filter or choosing another collection.</p></div>}
      <button className={`drawer-backdrop ${filtersOpen ? 'show' : ''}`} onClick={() => setFiltersOpen(false)} />
      <aside className={`filter-drawer ${filtersOpen ? 'open' : ''}`}><div className="drawer-head"><div><p className="eyebrow">Refine</p><h2>Filters</h2></div><button className="icon-button" onClick={() => setFiltersOpen(false)}><X /></button></div>{availableBrands.length ? <FilterGroup title="Brand" values={availableBrands} value={brand} onChange={setBrand} /> : null}{availableCompatibility.length ? <FilterGroup title="Compatibility" values={availableCompatibility} value={compatibility} onChange={setCompatibility} /> : null}{availableConfigurations.length ? <FilterGroup title="Configuration" values={availableConfigurations} value={configuration} onChange={setConfiguration} /> : null}{availableFinishes.length ? <FilterGroup title="Finish" values={availableFinishes} value={finish} onChange={setFinish} /> : null}<div className="filter-actions"><button className="button dark full" onClick={() => setFiltersOpen(false)}>Show {products.length} products</button><button className="text-link" onClick={() => { setConfiguration(''); setFinish(''); setCompatibility(''); setBrand(''); }}>Clear filters</button></div></aside>
    </section>
  );
}

function FilterGroup({ title, values, value, onChange }: { title: string; values: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="filter-group"><h3>{title}</h3><div className="filter-pills">{values.map((item) => <button key={item} className={value === item ? 'active' : ''} onClick={() => onChange(value === item ? '' : item)}>{item}</button>)}</div></div>;
}
