import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, UploadCloud } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { uploadProductImage } from '../../lib/api';
import type { Category, Collection, Product, Specifications } from '../../types/domain';

const optionalPrice = z.number().nonnegative().optional();
const httpUrl = z.string().url('Enter a valid image URL.').refine((value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, 'Image URLs must use http or https.');

const schema = z.object({
  name: z.string().min(2, 'Name is required.').max(160),
  brand: z.string().max(100).optional(),
  model: z.string().max(120).optional(),
  barcode: z.string().max(100).optional(),
  condition: z.string().max(50).optional(),
  warrantyMonths: z.number().int().nonnegative().optional(),
  description: z.string().min(10, 'Add a useful description.'),
  price: z.number().nonnegative('Price cannot be negative.'),
  compareAtPrice: optionalPrice,
  costPrice: optionalPrice,
  stock: z.number().int().nonnegative('Stock cannot be negative.'),
  lowStockThreshold: z.number().int().nonnegative(),
  categoryId: z.string().optional(),
  collectionIds: z.array(z.string()),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  isFeatured: z.boolean(),
  compatibilityText: z.string(),
  highlightsText: z.string(),
  whatsInBoxText: z.string(),
  tagsText: z.string(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(180).optional(),
  specifications: z.array(z.object({ key: z.string().max(100), value: z.string().max(500) })).max(40),
  images: z.array(z.object({ url: z.union([z.literal(''), httpUrl]) })).max(20),
  variants: z.array(z.object({
    id: z.string().optional(),
    sku: z.string().min(2, 'SKU is required.').max(100),
    size: z.string().max(80).optional(),
    color: z.string().max(80).optional(),
    barcode: z.string().max(100).optional(),
    price: optionalPrice,
    costPrice: optionalPrice,
    stock: z.number().int().nonnegative('Stock cannot be negative.'),
    lowStockThreshold: z.number().int().nonnegative(),
    compatibilityText: z.string(),
    specificationsText: z.string(),
    image: z.union([z.literal(''), httpUrl]).optional(),
  })).max(200),
});
export type ProductFormValues = z.infer<typeof schema>;

interface Props {
  product?: Product | null;
  categories: Category[];
  collections: Collection[];
  isSubmitting: boolean;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
}

function listToText(values?: string[] | null) { return values?.join('\n') ?? ''; }
function specsToText(specs?: Specifications | null) {
  return Object.entries(specs ?? {}).map(([key, value]) => `${key}: ${value}`).join('\n');
}
function specsToRows(specs?: Specifications | null) {
  const rows = Object.entries(specs ?? {}).map(([key, value]) => ({ key, value }));
  return rows.length ? rows : [{ key: '', value: '' }];
}

export function ProductForm({ product, categories, collections, isSubmitting, onSubmit, onCancel }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const { register, control, handleSubmit, reset, getValues, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', brand: '', model: '', barcode: '', condition: 'NEW', warrantyMonths: 12,
      description: '', price: 0, compareAtPrice: undefined, costPrice: undefined, stock: 0,
      lowStockThreshold: 5, categoryId: '', collectionIds: [], status: 'ACTIVE', isFeatured: false,
      compatibilityText: '', highlightsText: '', whatsInBoxText: '', tagsText: '', seoTitle: '', seoDescription: '',
      specifications: [{ key: '', value: '' }], images: [{ url: '' }], variants: [],
    },
  });
  const images = useFieldArray({ control, name: 'images' });
  const variants = useFieldArray({ control, name: 'variants', keyName: '_key' });
  const specifications = useFieldArray({ control, name: 'specifications' });
  const watchedImages = useWatch({ control, name: 'images' }) ?? [];
  const watchedVariants = useWatch({ control, name: 'variants' }) ?? [];
  const variantStock = watchedVariants.reduce((sum, variant) => sum + (Number(variant?.stock) || 0), 0);

  useEffect(() => {
    reset({
      name: product?.name ?? '', brand: product?.brand ?? '', model: product?.model ?? '', barcode: product?.barcode ?? '',
      condition: product?.condition ?? 'NEW', warrantyMonths: product?.warrantyMonths ?? undefined,
      description: product?.description ?? '', price: Number(product?.price ?? 0),
      compareAtPrice: product?.compareAtPrice == null ? undefined : Number(product.compareAtPrice),
      costPrice: product?.costPrice == null ? undefined : Number(product.costPrice),
      stock: product?.stock ?? 0, lowStockThreshold: product?.lowStockThreshold ?? 5,
      categoryId: product?.categoryId ?? product?.category?.id ?? '',
      collectionIds: product?.collections?.map((item) => item.collectionId) ?? [],
      status: product?.status ?? (product?.isActive === false ? 'ARCHIVED' : 'ACTIVE'),
      isFeatured: product?.isFeatured ?? false,
      compatibilityText: listToText(product?.compatibility), highlightsText: listToText(product?.highlights),
      whatsInBoxText: listToText(product?.whatsInBox), tagsText: product?.tags?.join(', ') ?? '',
      seoTitle: product?.seoTitle ?? '', seoDescription: product?.seoDescription ?? '',
      specifications: specsToRows(product?.specifications),
      images: product?.images?.length ? product.images.map((url) => ({ url })) : [{ url: '' }],
      variants: product?.variants?.map((variant) => ({
        id: variant.id, sku: variant.sku, size: variant.size ?? '', color: variant.color ?? '', barcode: variant.barcode ?? '',
        price: variant.price == null ? undefined : Number(variant.price), costPrice: variant.costPrice == null ? undefined : Number(variant.costPrice),
        stock: variant.stock, lowStockThreshold: variant.lowStockThreshold ?? 3,
        compatibilityText: listToText(variant.compatibility), specificationsText: specsToText(variant.specifications), image: variant.image ?? '',
      })) ?? [],
    });
    setUploadError('');
  }, [product, reset]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploadError('');
    const selected = Array.from(files);
    const currentCount = getValues('images').filter((item) => item.url.trim()).length;
    if (currentCount + selected.length > 20) { setUploadError('A product can have up to 20 images.'); return; }
    setUploading(true);
    try {
      for (const file of selected) {
        const asset = await uploadProductImage(file);
        const current = getValues('images');
        const emptyIndex = current.findIndex((item) => !item?.url?.trim());
        if (emptyIndex >= 0) images.update(emptyIndex, { url: asset.secureUrl });
        else images.append({ url: asset.secureUrl });
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The image could not be uploaded.');
    } finally { setUploading(false); }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-section">
        <div className="form-section__header"><div><strong>Publishing</strong><span>Control visibility, merchandising, category and collection placement.</span></div></div>
        <div className="form-grid">
          <label className="field field--wide"><span>Product name</span><input placeholder="Orbit Pro Wireless Earbuds" {...register('name')} />{errors.name ? <small>{errors.name.message}</small> : null}</label>
          <label className="field"><span>Status</span><select {...register('status')}><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></label>
          <label className="field"><span>Category</span><select {...register('categoryId')}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <fieldset className="field field--wide"><span>Collections</span><div className="option-check-grid">{collections.map((collection) => <label key={collection.id} className="check-card"><input type="checkbox" value={collection.id} {...register('collectionIds')} /><span><strong>{collection.name}</strong><small>{collection.productCount ?? 0} products</small></span></label>)}</div></fieldset>
          <label className="switch-row field--wide"><input type="checkbox" {...register('isFeatured')} /><span className="switch" /><div><strong>Featured product</strong><span>Eligible for homepage and featured collection placements.</span></div></label>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section__header"><div><strong>Tech identity</strong><span>Information customers use to confirm the exact device and model.</span></div></div>
        <div className="form-grid">
          <label className="field"><span>Brand</span><input placeholder="Cosmic Tech, Apple, Anker…" {...register('brand')} /></label>
          <label className="field"><span>Model</span><input placeholder="Orbit Pro / A2347" {...register('model')} /></label>
          <label className="field"><span>Barcode / EAN</span><input placeholder="Optional barcode" {...register('barcode')} /></label>
          <label className="field"><span>Condition</span><select {...register('condition')}><option value="NEW">New</option><option value="OPEN_BOX">Open box</option><option value="REFURBISHED">Refurbished</option></select></label>
          <label className="field"><span>Warranty</span><div className="input-suffix"><input type="number" min="0" {...register('warrantyMonths', { setValueAs: (value) => value === '' ? undefined : Number(value) })} /><span>months</span></div></label>
          <label className="field field--wide"><span>Description</span><textarea rows={5} placeholder="Explain the product, use case, connection, charging, warranty and important compatibility details." {...register('description')} />{errors.description ? <small>{errors.description.message}</small> : null}</label>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section__header"><div><strong>Pricing & inventory rules</strong><span>Stock changes are recorded in the inventory ledger.</span></div></div>
        <div className="form-grid">
          <label className="field"><span>Selling price</span><div className="input-prefix"><span>Rs</span><input type="number" min="0" step="0.01" {...register('price', { valueAsNumber: true })} /></div></label>
          <label className="field"><span>Compare-at price</span><div className="input-prefix"><span>Rs</span><input type="number" min="0" step="0.01" placeholder="Optional" {...register('compareAtPrice', { setValueAs: (value) => value === '' ? undefined : Number(value) })} /></div></label>
          <label className="field"><span>Cost price</span><div className="input-prefix"><span>Rs</span><input type="number" min="0" step="0.01" placeholder="Private" {...register('costPrice', { setValueAs: (value) => value === '' ? undefined : Number(value) })} /></div></label>
          <label className="field"><span>{watchedVariants.length ? 'Total configuration stock' : 'Stock on hand'}</span>{watchedVariants.length ? <input type="number" value={variantStock} disabled /> : <input type="number" min="0" {...register('stock', { valueAsNumber: true })} />}</label>
          <label className="field"><span>Low-stock threshold</span><input type="number" min="0" {...register('lowStockThreshold', { valueAsNumber: true })} /></label>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section__header"><div><strong>Compatibility & customer guidance</strong><span>Use one item per line so customers can quickly confirm fit.</span></div></div>
        <div className="form-grid">
          <label className="field"><span>Compatibility</span><textarea rows={6} placeholder={'iPhone 15 series\nUSB-C PD\nAndroid\nMacBook Air'} {...register('compatibilityText')} /></label>
          <label className="field"><span>Highlights</span><textarea rows={6} placeholder={'65W Power Delivery\nGaN design\nThree charging ports'} {...register('highlightsText')} /></label>
          <label className="field"><span>What’s in the box</span><textarea rows={6} placeholder={'Charger\nUSB-C cable\nUser guide'} {...register('whatsInBoxText')} /></label>
          <label className="field"><span>Tags</span><textarea rows={6} placeholder="charger, usb-c, gan, fast-charging" {...register('tagsText')} /></label>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section__header"><div><strong>Technical specifications</strong><span>Add structured facts such as wattage, connector, Bluetooth version and battery capacity.</span></div><Button type="button" variant="secondary" size="sm" onClick={() => specifications.append({ key: '', value: '' })}><Plus size={15} /> Add specification</Button></div>
        <div className="spec-editor">{specifications.fields.map((field, index) => <div className="spec-row" key={field.id}><input placeholder="Specification" {...register(`specifications.${index}.key`)} /><input placeholder="Value" {...register(`specifications.${index}.value`)} /><button type="button" className="icon-button icon-button--danger" onClick={() => specifications.fields.length === 1 ? specifications.update(0, { key: '', value: '' }) : specifications.remove(index)}><Trash2 size={16} /></button></div>)}</div>
      </div>

      <div className="form-section">
        <div className="form-section__header"><div><strong>Product images</strong><span>Upload, preview and reorder the storefront gallery.</span></div><div className="image-actions"><label className={`button button--secondary button--sm file-button ${uploading ? 'is-disabled' : ''}`}><UploadCloud size={15} /> {uploading ? 'Uploading…' : 'Upload images'}<input type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => { void handleUpload(event.target.files); event.currentTarget.value = ''; }} /></label><Button type="button" variant="secondary" size="sm" onClick={() => images.append({ url: '' })} disabled={images.fields.length >= 20}><Plus size={15} /> Add URL</Button></div></div>
        {uploadError ? <div className="form-alert">{uploadError}</div> : null}
        <div className="image-url-list image-gallery-editor">{images.fields.map((field, index) => { const url = watchedImages[index]?.url ?? ''; return <div key={field.id} className="image-editor-row"><span className="image-editor-preview">{url ? <img src={url} alt="" /> : <ImagePlus size={20} />}</span><div className="image-editor-input"><input placeholder="https://cdn.example.com/product.jpg" {...register(`images.${index}.url`)} /></div><div className="image-editor-controls"><button type="button" className="icon-button" onClick={() => images.move(index, index - 1)} disabled={index === 0}><ArrowUp size={15} /></button><button type="button" className="icon-button" onClick={() => images.move(index, index + 1)} disabled={index === images.fields.length - 1}><ArrowDown size={15} /></button><button type="button" className="icon-button icon-button--danger" onClick={() => images.fields.length === 1 ? images.update(0, { url: '' }) : images.remove(index)}><Trash2 size={16} /></button></div></div>; })}</div>
        <datalist id="product-image-urls">{watchedImages.filter((item) => item?.url).map((item) => <option key={item.url} value={item.url} />)}</datalist>
      </div>

      <div className="form-section">
        <div className="form-section__header"><div><strong>Product configurations</strong><span>Use configurations for connector, length, wattage, capacity, finish, plug type or model.</span></div><Button type="button" variant="secondary" size="sm" onClick={() => variants.append({ sku: '', size: '', color: '', barcode: '', price: undefined, costPrice: undefined, stock: 0, lowStockThreshold: 3, compatibilityText: '', specificationsText: '', image: '' })}><Plus size={15} /> Add configuration</Button></div>
        {variants.fields.length ? <div className="variant-editor">{variants.fields.map((field, index) => <div className="variant-row variant-row--expanded" key={field._key}><input type="hidden" {...register(`variants.${index}.id`)} /><label className="field"><span>SKU</span><input placeholder="CHARGER-65W-UK" {...register(`variants.${index}.sku`)} /></label><label className="field"><span>Configuration</span><input placeholder="65W · UK plug" {...register(`variants.${index}.size`)} /></label><label className="field"><span>Finish</span><input placeholder="Graphite" {...register(`variants.${index}.color`)} /></label><label className="field"><span>Barcode</span><input {...register(`variants.${index}.barcode`)} /></label><label className="field"><span>Price override</span><input type="number" min="0" step="0.01" {...register(`variants.${index}.price`, { setValueAs: (value) => value === '' ? undefined : Number(value) })} /></label><label className="field"><span>Cost price</span><input type="number" min="0" step="0.01" {...register(`variants.${index}.costPrice`, { setValueAs: (value) => value === '' ? undefined : Number(value) })} /></label><label className="field"><span>Stock</span><input type="number" min="0" {...register(`variants.${index}.stock`, { valueAsNumber: true })} /></label><label className="field"><span>Low-stock alert</span><input type="number" min="0" {...register(`variants.${index}.lowStockThreshold`, { valueAsNumber: true })} /></label><label className="field field--wide"><span>Compatibility</span><input placeholder="USB-C, iPhone, Android" {...register(`variants.${index}.compatibilityText`)} /></label><label className="field field--wide"><span>Configuration specifications</span><textarea rows={3} placeholder={'Connector: USB-C\nOutput: 65W\nPlug: UK'} {...register(`variants.${index}.specificationsText`)} /></label><label className="field field--wide"><span>Configuration image</span><input list="product-image-urls" {...register(`variants.${index}.image`)} /></label><button type="button" className="icon-button icon-button--danger variant-remove" onClick={() => variants.remove(index)}><Trash2 size={16} /></button></div>)}</div> : <p className="form-hint">No configurations. Product-level stock will be used.</p>}
      </div>

      <div className="form-section"><div className="form-section__header"><div><strong>Search preview</strong><span>Optional metadata for search engines and social previews.</span></div></div><div className="form-grid"><label className="field field--wide"><span>SEO title</span><input maxLength={70} {...register('seoTitle')} /></label><label className="field field--wide"><span>SEO description</span><textarea rows={3} maxLength={180} {...register('seoDescription')} /></label></div></div>

      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" isLoading={isSubmitting || uploading} disabled={uploading}>{product ? 'Save changes' : 'Create product'}</Button></div>
    </form>
  );
}
