import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, MessageSquareText, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { ADMIN_API, apiRequest, unwrapEntity, unwrapList } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { Product, Review, ReviewStatus } from '../../types/domain';
import { useAuth } from '../auth/AuthContext';

interface ReviewForm {
  productId: string;
  reviewerName: string;
  reviewerEmail: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  isFeatured: boolean;
  adminNote: string;
}

const emptyForm: ReviewForm = {
  productId: '',
  reviewerName: '',
  reviewerEmail: '',
  rating: 5,
  title: '',
  body: '',
  status: 'APPROVED',
  isFeatured: false,
  adminNote: '',
};

function statusTone(status: ReviewStatus) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED') return 'danger' as const;
  return 'warning' as const;
}

function stars(value: number) {
  return Array.from({ length: 5 }, (_, index) => (
    <Star key={index} size={13} fill={index < value ? 'currentColor' : 'none'} />
  ));
}

export function ReviewsPage() {
  const queryClient = useQueryClient();
  const { admin } = useAuth();
  const [status, setStatus] = useState<'ALL' | ReviewStatus>('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Review | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [form, setForm] = useState<ReviewForm>(emptyForm);

  const reviewsQuery = useQuery({
    queryKey: ['reviews', status],
    queryFn: async () => unwrapList<Review>(await apiRequest(`${ADMIN_API.reviews}${status === 'ALL' ? '' : `?status=${status}`}`), ['reviews']),
  });
  const productsQuery = useQuery({
    queryKey: ['products', 'review-picker'],
    queryFn: async () => unwrapList<Product>(await apiRequest(`${ADMIN_API.products}?status=ALL`), ['products']),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (editing === undefined) return;
    if (!editing) {
      setForm(emptyForm);
      return;
    }
    setForm({
      productId: editing.productId,
      reviewerName: editing.reviewerName,
      reviewerEmail: editing.reviewerEmail ?? '',
      rating: editing.rating,
      title: editing.title ?? '',
      body: editing.body,
      status: editing.status,
      isFeatured: editing.isFeatured,
      adminNote: editing.adminNote ?? '',
    });
  }, [editing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return unwrapEntity<Review>(await apiRequest(ADMIN_API.review(editing.id), {
          method: 'PATCH',
          body: {
            reviewerName: form.reviewerName,
            reviewerEmail: form.reviewerEmail.trim() || null,
            rating: form.rating,
            title: form.title.trim() || null,
            body: form.body,
            status: form.status,
            isFeatured: form.isFeatured,
            adminNote: form.adminNote.trim() || null,
          },
        }), ['review']);
      }
      return unwrapEntity<Review>(await apiRequest(ADMIN_API.reviews, {
        method: 'POST',
        body: {
          productId: form.productId,
          reviewerName: form.reviewerName,
          reviewerEmail: form.reviewerEmail.trim() || null,
          rating: form.rating,
          title: form.title.trim() || null,
          body: form.body,
          status: form.status,
          isFeatured: form.isFeatured,
          adminNote: form.adminNote.trim() || null,
        },
      }), ['review']);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setEditing(undefined);
    },
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: ReviewStatus }) => unwrapEntity<Review>(
      await apiRequest(ADMIN_API.review(id), { method: 'PATCH', body: { status: nextStatus } }),
      ['review'],
    ),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(ADMIN_API.review(id), { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setDeleting(null);
      if (editing && deleting?.id === editing.id) setEditing(undefined);
    },
  });

  const reviews = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return reviewsQuery.data ?? [];
    return (reviewsQuery.data ?? []).filter((review) => [
      review.reviewerName,
      review.reviewerEmail ?? '',
      review.product?.name ?? '',
      review.title ?? '',
      review.body,
    ].some((value) => value.toLowerCase().includes(needle)));
  }, [reviewsQuery.data, search]);

  if (reviewsQuery.isLoading) return <LoadingState label="Loading reviews" />;

  return <div>
    <PageHeader
      eyebrow="Social proof"
      title="Reviews"
      description="Moderate website submissions and add or edit store-entered reviews. Customer-submitted reviews remain transparently labelled if their content is edited by staff."
      actions={<Button onClick={() => setEditing(null)}><Plus size={16} /> Add review</Button>}
    />

    <section className="panel">
      <div className="toolbar toolbar--wrap">
        <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reviewer, product, or review" /></label>
        <div className="filter-tabs">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((item) => <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>{item}</button>)}
        </div>
      </div>
      {reviews.length ? <div className="table-wrap"><table><thead><tr><th>Reviewer</th><th>Product</th><th>Rating</th><th>Source</th><th>Status</th><th>Submitted</th><th /></tr></thead><tbody>{reviews.map((review) => <tr key={review.id}>
        <td><div className="stacked-cell"><strong>{review.reviewerName}</strong><span>{review.reviewerEmail || 'No email'}</span>{review.isVerifiedPurchase ? <span className="review-verified-copy"><BadgeCheck size={12} /> Verified purchase</span> : null}</div></td>
        <td><div className="stacked-cell"><strong>{review.product?.name ?? 'Unknown product'}</strong><span>{review.title || review.body.slice(0, 72)}</span></div></td>
        <td><span className="admin-review-stars" aria-label={`${review.rating} out of 5`}>{stars(review.rating)}</span></td>
        <td><Badge tone={review.source === 'WEBSITE' ? 'info' : 'neutral'}>{review.source}</Badge>{review.editedByAdminAt ? <span className="table-subline">Edited by staff</span> : null}</td>
        <td><Badge tone={statusTone(review.status)}>{review.status}</Badge>{review.isFeatured ? <span className="table-subline">Featured</span> : null}</td>
        <td>{formatDate(review.createdAt)}</td>
        <td><div className="row-actions">{review.status !== 'APPROVED' ? <button className="icon-button" title="Approve" onClick={() => moderateMutation.mutate({ id: review.id, nextStatus: 'APPROVED' })}><Check size={16} /></button> : null}{review.status !== 'REJECTED' ? <button className="icon-button" title="Reject" onClick={() => moderateMutation.mutate({ id: review.id, nextStatus: 'REJECTED' })}><X size={16} /></button> : null}<button className="icon-button" title="Edit review" onClick={() => setEditing(review)}><Pencil size={16} /></button>{admin?.role === 'SUPERADMIN' ? <button className="icon-button icon-button--danger" title="Delete review" onClick={() => setDeleting(review)}><Trash2 size={15} /></button> : null}</div></td>
      </tr>)}</tbody></table></div> : <EmptyState icon={MessageSquareText} title="No matching reviews" description="Website reviews will arrive here for moderation, or you can add an external review manually." actionLabel="Add review" onAction={() => setEditing(null)} />}
    </section>

    <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit review' : 'Add review'} description={editing?.source === 'WEBSITE' ? 'Editing customer-submitted wording is recorded and disclosed on the storefront.' : 'Store-entered reviews are labelled as such on the storefront.'} size="lg">
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
        <div className="form-grid">
          {!editing ? <label className="field field--wide"><span>Product</span><select required value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">Choose product</option>{productsQuery.data?.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label> : <div className="review-product-lock field--wide"><span>Product</span><strong>{editing.product?.name ?? 'Product'}</strong></div>}
          <label className="field"><span>Reviewer name</span><input required minLength={2} value={form.reviewerName} onChange={(event) => setForm({ ...form, reviewerName: event.target.value })} /></label>
          <label className="field"><span>Reviewer email</span><input type="email" value={form.reviewerEmail} onChange={(event) => setForm({ ...form, reviewerEmail: event.target.value })} placeholder="Optional for store-entered reviews" /></label>
          <label className="field"><span>Rating</span><select value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value === 1 ? '' : 's'}</option>)}</select></label>
          <label className="field"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ReviewStatus })}><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
          <label className="field field--wide"><span>Review title</span><input maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Optional headline" /></label>
          <label className="field field--wide"><span>Review</span><textarea required minLength={10} rows={6} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label>
          <label className="field field--wide"><span>Internal moderation note</span><textarea rows={3} value={form.adminNote} onChange={(event) => setForm({ ...form, adminNote: event.target.value })} placeholder="Only admins see this note" /></label>
          <label className="checkbox-row field--wide"><input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} /><span>Feature this review for future merchandising sections</span></label>
        </div>
        {editing?.isVerifiedPurchase ? <div className="review-editor-note"><BadgeCheck size={17} /><div><strong>Verified purchase</strong><span>This badge was created from a real paid/shipped/delivered website order and cannot be manually assigned.</span></div></div> : null}
        {saveMutation.error ? <div className="form-alert">{saveMutation.error.message}</div> : null}
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditing(undefined)}>Cancel</Button><Button type="submit" isLoading={saveMutation.isPending}>{editing ? 'Save review' : 'Create review'}</Button></div>
      </form>
    </Modal>

    <Modal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete review permanently" description="This removes the review from moderation history and the storefront.">
      <div className="delete-order-dialog"><div className="delete-warning"><Trash2 size={20} /><div><strong>Delete {deleting?.reviewerName}'s review?</strong><span>Use Reject instead if you want to preserve a moderation record.</span></div></div>{deleteMutation.error ? <div className="form-alert">{deleteMutation.error.message}</div> : null}<div className="modal-actions"><Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" isLoading={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting.id)}>Delete permanently</Button></div></div>
    </Modal>
  </div>;
}
