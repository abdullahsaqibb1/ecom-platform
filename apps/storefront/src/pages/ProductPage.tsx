import { BadgeCheck, ChevronDown, Minus, Plus, ShieldCheck, Star, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { formatMoney } from '../lib/format';
import { getProduct, getProductReviews, getProducts, submitProductReview } from '../lib/api';
import type { ProductVariant } from '../types/domain';

export function ProductPage() {
  const { idOrSlug = '' } = useParams();
  const { data: product, isLoading, error } = useQuery({ queryKey: ['product', idOrSlug], queryFn: () => getProduct(idOrSlug) });
  const relatedParams = useMemo(() => {
    const params = new URLSearchParams();
    if (product?.category?.slug) params.set('category', product.category.slug);
    params.set('limit', '8');
    return params;
  }, [product?.category?.slug]);
  const { data: related } = useQuery({
    queryKey: ['products', 'related', product?.category?.slug ?? 'all'],
    queryFn: () => getProducts(relatedParams),
    enabled: Boolean(product),
  });
  const reviewsQuery = useQuery({
    queryKey: ['product-reviews', idOrSlug],
    queryFn: () => getProductReviews(idOrSlug),
    enabled: Boolean(product),
  });
  const { addItem } = useCart();
  const { user } = useAuth();
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [reviewForm, setReviewForm] = useState({ reviewerName: '', reviewerEmail: '', rating: 5, title: '', body: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const selectedVariant = useMemo<ProductVariant | undefined>(() => product?.variants?.find((item) => item.id === selectedVariantId) ?? product?.variants?.find((item) => item.stock > 0), [product, selectedVariantId]);

  useEffect(() => {
    if (!user) return;
    setReviewForm((current) => ({
      ...current,
      reviewerName: current.reviewerName || user.name || '',
      reviewerEmail: current.reviewerEmail || user.email,
    }));
  }, [user]);

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewError('');
    setReviewMessage('');
    setReviewSubmitting(true);
    try {
      const result = await submitProductReview(idOrSlug, {
        reviewerName: reviewForm.reviewerName,
        reviewerEmail: reviewForm.reviewerEmail,
        rating: reviewForm.rating,
        title: reviewForm.title.trim() || null,
        body: reviewForm.body,
      });
      setReviewMessage(result.message || 'Thanks. Your review was submitted for moderation.');
      setReviewForm((current) => ({ ...current, title: '', body: '', rating: 5 }));
      await reviewsQuery.refetch();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to submit your review.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (isLoading) return <div className="page-loader">Loading product…</div>;
  if (error || !product) return <div className="page-loader">This product could not be found.</div>;

  const variants = product.variants ?? [];
  const relatedProducts = related?.items.filter((item) => item.id !== product.id).slice(0, 4) ?? [];
  const selectedCompatibility = selectedVariant?.compatibility?.length ? selectedVariant.compatibility : product.compatibility ?? [];
  const selectedSpecifications = {
    ...(product.specifications ?? {}),
    ...(selectedVariant?.specifications ?? {}),
  };
  const galleryImages = Array.from(new Set([
    ...(product.images ?? []),
    ...(variants.map((variant) => variant.image).filter(Boolean) as string[]),
  ]));
  const warrantyLabel = product.warrantyMonths ? `${product.warrantyMonths}-month warranty` : 'Warranty information available on request';

  return (
    <>
      <section className="product-page">
        <div className="product-gallery">
          <div className="gallery-thumbs">{galleryImages.map((image, index) => <button key={image} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)}><img src={image} alt="" /></button>)}</div>
          <div className="gallery-main"><img src={galleryImages[activeImage] || galleryImages[0]} alt={product.name} /></div>
        </div>
        <div className="product-info">
          <p className="breadcrumb"><Link to="/">Home</Link> / <Link to={`/collections/${product.category?.slug ?? 'all'}`}>{product.category?.name ?? 'Products'}</Link></p>
          {product.brand ? <p className="product-brand">{product.brand}{product.model ? ` · ${product.model}` : ''}</p> : null}
          <h1>{product.name}</h1>
          <div className="product-price-row">
            <p className="product-price">{formatMoney(selectedVariant?.price ?? product.price)}</p>
            {product.compareAtPrice && Number(product.compareAtPrice) > Number(selectedVariant?.price ?? product.price) ? <span>{formatMoney(product.compareAtPrice)}</span> : null}
          </div>

          <div className="tech-product-meta">
            {product.condition ? <span>{product.condition}</span> : null}
            <span>{warrantyLabel}</span>
            {(selectedVariant?.stock ?? product.stock) > 0 ? <span>In stock</span> : <span>Out of stock</span>}
          </div>

          {(selectedVariant?.color || product.color) && <div className="option-block"><span>Finish — {selectedVariant?.color || product.color}</span><button className="color-swatch active" aria-label={selectedVariant?.color || product.color} style={{ background: colorValue(selectedVariant?.color || product.color || '') }} /></div>}

          {variants.length > 0 && <div className="option-block"><div className="option-title"><span>Configuration</span></div><div className="size-options">{variants.map((variant) => <button key={variant.id} disabled={variant.stock <= 0} className={(selectedVariant?.id === variant.id ? 'active ' : '') + (variant.stock <= 0 ? 'sold-out' : '')} onClick={() => { setSelectedVariantId(variant.id); if (variant.image) { const imageIndex = galleryImages.indexOf(variant.image); if (imageIndex >= 0) setActiveImage(imageIndex); } }}>{variant.size || variant.color || 'Standard'}</button>)}</div></div>}

          {selectedCompatibility.length ? <div className="compatibility-strip"><span>Compatible with</span><div>{selectedCompatibility.map((item) => <b key={item}>{item}</b>)}</div></div> : null}

          <div className="buy-row"><div className="quantity-control large"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={14} /></button><span>{quantity}</span><button onClick={() => setQuantity(quantity + 1)}><Plus size={14} /></button></div><button className="button dark grow" disabled={(selectedVariant?.stock ?? product.stock) <= 0} onClick={() => addItem(product, selectedVariant, quantity)}>{(selectedVariant?.stock ?? product.stock) <= 0 ? 'Sold out' : 'Add to bag'}</button></div>

          <div className="shipping-note"><Truck size={18} /><div><strong>Complimentary delivery above Rs. 2,500</strong><span>Estimated dispatch within 1–2 working days.</span></div></div>

          <Accordion title="Overview" defaultOpen><p>{product.description}</p><div className="product-identifiers">{selectedVariant?.sku ? <p><strong>SKU</strong><span>{selectedVariant.sku}</span></p> : null}{selectedVariant?.barcode || product.barcode ? <p><strong>Barcode</strong><span>{selectedVariant?.barcode || product.barcode}</span></p> : null}</div></Accordion>
          {Object.keys(selectedSpecifications).length ? <Accordion title="Technical specifications"><div className="specification-table">{Object.entries(selectedSpecifications).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></Accordion> : null}
          {product.highlights?.length ? <Accordion title="Highlights"><ul>{product.highlights.map((item) => <li key={item}>{item}</li>)}</ul></Accordion> : null}
          {product.whatsInBox?.length ? <Accordion title="What’s in the box"><ul>{product.whatsInBox.map((item) => <li key={item}>{item}</li>)}</ul></Accordion> : null}
          <Accordion title="Delivery, returns & warranty"><div className="warranty-note"><ShieldCheck size={18} /><div><strong>{warrantyLabel}</strong><p>Shipping is calculated at checkout. Unused items may be returned within the configured return window. Warranty terms are recorded with your order.</p></div></div></Accordion>
        </div>
      </section>
      <section className="reviews-section" id="reviews">
        <div className="reviews-head">
          <div><p className="eyebrow">Customer feedback</p><h2>Reviews</h2></div>
          <div className="reviews-score"><strong>{Number(reviewsQuery.data?.summary.average ?? 0).toFixed(1)}</strong><span><span className="review-stars">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} fill={star <= Math.round(Number(reviewsQuery.data?.summary.average ?? 0)) ? 'currentColor' : 'none'} />)}</span><small>{reviewsQuery.data?.summary.count ?? 0} approved review{(reviewsQuery.data?.summary.count ?? 0) === 1 ? '' : 's'}</small></span></div>
        </div>
        <div className="reviews-layout">
          <div className="reviews-list">
            {reviewsQuery.isLoading ? <p>Loading reviews…</p> : (reviewsQuery.data?.reviews.length ?? 0) === 0 ? <div className="review-empty"><h3>No published reviews yet</h3><p>Be the first to share your experience with this product.</p></div> : reviewsQuery.data?.reviews.map((review) => <article className="review-card" key={review.id}>
              <div className="review-card__top"><span className="review-stars">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill={star <= review.rating ? 'currentColor' : 'none'} />)}</span><small>{new Date(review.createdAt).toLocaleDateString()}</small></div>
              {review.title ? <h3>{review.title}</h3> : null}<p>{review.body}</p>
              <footer><strong>{review.reviewerName}</strong>{review.isVerifiedPurchase ? <span><BadgeCheck size={14} /> Verified purchase</span> : null}{review.source !== 'WEBSITE' ? <small>Store-entered review</small> : null}{review.editedByAdminAt ? <small>Edited for clarity by store</small> : null}</footer>
            </article>)}
          </div>
          <form className="review-form" onSubmit={handleReviewSubmit}>
            <p className="eyebrow">Share your experience</p><h3>Write a review</h3><p>Your email is used for moderation and is never displayed publicly.</p>
            <div className="review-rating-input"><span>Rating</span><div>{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} aria-label={`${star} star${star === 1 ? '' : 's'}`} onClick={() => setReviewForm({ ...reviewForm, rating: star })}><Star size={22} fill={star <= reviewForm.rating ? 'currentColor' : 'none'} /></button>)}</div></div>
            <label>Name<input value={reviewForm.reviewerName} onChange={(event) => setReviewForm({ ...reviewForm, reviewerName: event.target.value })} required /></label>
            <label>Email<input type="email" value={reviewForm.reviewerEmail} onChange={(event) => setReviewForm({ ...reviewForm, reviewerEmail: event.target.value })} required /></label>
            <label>Review title <span>Optional</span><input value={reviewForm.title} onChange={(event) => setReviewForm({ ...reviewForm, title: event.target.value })} maxLength={160} /></label>
            <label>Your review<textarea rows={5} value={reviewForm.body} onChange={(event) => setReviewForm({ ...reviewForm, body: event.target.value })} minLength={10} maxLength={5000} required /></label>
            {reviewMessage ? <p className="review-success">{reviewMessage}</p> : null}{reviewError ? <p className="form-error">{reviewError}</p> : null}
            <button className="button dark" disabled={reviewSubmitting}>{reviewSubmitting ? 'Submitting…' : 'Submit review'}</button>
          </form>
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
