import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, UploadCloud } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { uploadProductImage } from '../../lib/api';
import type { Category, Product } from '../../types/domain';

const optionalPrice = z.number().nonnegative().optional();
const httpUrl = z.string().url('Enter a valid image URL.').refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'Image URLs must use http or https.');

const schema = z.object({
  name: z.string().min(2, 'Name is required.').max(120),
  description: z.string().min(10, 'Add a useful description.'),
  price: z.number().nonnegative('Price cannot be negative.'),
  stock: z.number().int().nonnegative('Stock cannot be negative.'),
  categoryId: z.string().optional(),
  isActive: z.boolean(),
  images: z.array(z.object({ url: z.union([z.literal(''), httpUrl]) })).max(12),
  variants: z.array(z.object({
    id: z.string().optional(),
    sku: z.string().min(2, 'SKU is required.').max(100),
    size: z.string().max(40).optional(),
    color: z.string().max(60).optional(),
    price: optionalPrice,
    stock: z.number().int().nonnegative('Stock cannot be negative.'),
    image: z.union([z.literal(''), httpUrl]).optional(),
  })).max(100),
});
export type ProductFormValues = z.infer<typeof schema>;

interface Props {
  product?: Product | null;
  categories: Category[];
  isSubmitting: boolean;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ product, categories, isSubmitting, onSubmit, onCancel }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', description: '', price: 0, stock: 0, categoryId: '', isActive: true,
      images: [{ url: '' }], variants: [],
    },
  });
  const images = useFieldArray({ control, name: 'images' });
  const variants = useFieldArray({ control, name: 'variants', keyName: '_key' });
  const watchedImages = useWatch({ control, name: 'images' }) ?? [];
  const watchedVariants = useWatch({ control, name: 'variants' }) ?? [];
  const variantStock = watchedVariants.reduce((sum, variant) => sum + (Number(variant?.stock) || 0), 0);

  useEffect(() => {
    reset({
      name: product?.name ?? '',
      description: product?.description ?? '',
      price: Number(product?.price ?? 0),
      stock: product?.stock ?? 0,
      categoryId: product?.categoryId ?? product?.category?.id ?? '',
      isActive: product?.isActive ?? true,
      images: product?.images?.length ? product.images.map((url) => ({ url })) : [{ url: '' }],
      variants: product?.variants?.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size ?? '',
        color: variant.color ?? '',
        price: variant.price == null ? undefined : Number(variant.price),
        stock: variant.stock,
        image: variant.image ?? '',
      })) ?? [],
    });
    setUploadError('');
  }, [product, reset]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploadError('');
    const selected = Array.from(files);
    const currentCount = getValues('images').filter((item) => item.url.trim()).length;
    if (currentCount + selected.length > 12) {
      setUploadError('A product can have up to 12 images.');
      return;
    }

    setUploading(true);
    try {
      for (const file of selected) {
        const asset = await uploadProductImage(file);
        const current = getValues('images');
        const emptyIndex = current.findIndex((item) => !item?.url?.trim());
        if (emptyIndex >= 0) {
          images.update(emptyIndex, { url: asset.secureUrl });
        } else {
          images.append({ url: asset.secureUrl });
        }
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The image could not be uploaded.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-grid">
        <label className="field field--wide"><span>Product name</span><input placeholder="Wireless earbuds or 65W charger" {...register('name')} />{errors.name ? <small>{errors.name.message}</small> : null}</label>
        <label className="field"><span>Base price</span><div className="input-prefix"><span>Rs</span><input type="number" min="0" step="0.01" {...register('price', { valueAsNumber: true })} /></div>{errors.price ? <small>{errors.price.message}</small> : null}</label>
        <label className="field"><span>{watchedVariants.length ? 'Total variant stock' : 'Stock'}</span>{watchedVariants.length ? <input type="number" value={variantStock} disabled /> : <input type="number" min="0" step="1" {...register('stock', { valueAsNumber: true })} />}{errors.stock ? <small>{errors.stock.message}</small> : null}</label>
        <label className="field field--wide"><span>Category</span><select {...register('categoryId')}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="field field--wide"><span>Description</span><textarea rows={5} placeholder="Describe compatibility, power, connection type, features, and what is included." {...register('description')} />{errors.description ? <small>{errors.description.message}</small> : null}</label>
      </div>

      <div className="form-section">
        <div className="form-section__header">
          <div><strong>Product images</strong><span>Upload directly to Cloudinary, then reorder the storefront gallery.</span></div>
          <div className="image-actions">
            <label className={`button button--secondary button--sm file-button ${uploading ? 'is-disabled' : ''}`}>
              <UploadCloud size={15} /> {uploading ? 'Uploading…' : 'Upload images'}
              <input type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => { void handleUpload(event.target.files); event.currentTarget.value = ''; }} />
            </label>
            <Button type="button" variant="secondary" size="sm" onClick={() => images.append({ url: '' })} disabled={images.fields.length >= 12}><Plus size={15} /> Add URL</Button>
          </div>
        </div>
        {uploadError ? <div className="form-alert">{uploadError}</div> : null}
        <div className="image-url-list image-gallery-editor">
          {images.fields.map((field, index) => {
            const url = watchedImages[index]?.url ?? '';
            return <div key={field.id} className="image-editor-row">
              <span className="image-editor-preview">{url ? <img src={url} alt="" /> : <ImagePlus size={20} />}</span>
              <div className="image-editor-input"><input placeholder="https://cdn.example.com/product.jpg" {...register(`images.${index}.url`)} />{errors.images?.[index]?.url ? <small>{errors.images[index]?.url?.message}</small> : null}</div>
              <div className="image-editor-controls">
                <button type="button" className="icon-button" onClick={() => images.move(index, index - 1)} disabled={index === 0} title="Move up"><ArrowUp size={15} /></button>
                <button type="button" className="icon-button" onClick={() => images.move(index, index + 1)} disabled={index === images.fields.length - 1} title="Move down"><ArrowDown size={15} /></button>
                <button type="button" className="icon-button icon-button--danger" onClick={() => images.fields.length === 1 ? images.update(0, { url: '' }) : images.remove(index)} title="Remove"><Trash2 size={16} /></button>
              </div>
            </div>;
          })}
        </div>
        <datalist id="product-image-urls">{watchedImages.filter((item) => item?.url).map((item) => <option key={item.url} value={item.url} />)}</datalist>
      </div>

      <div className="form-section">
        <div className="form-section__header"><div><strong>Product configurations</strong><span>Use configurations for model, connector, length, power, capacity, finish, or device compatibility.</span></div><Button type="button" variant="secondary" size="sm" onClick={() => variants.append({ sku: '', size: '', color: '', price: undefined, stock: 0, image: '' })}><Plus size={15} /> Add variant</Button></div>
        {variants.fields.length ? <div className="variant-editor">
          {variants.fields.map((field, index) => <div className="variant-row" key={field._key}>
            <input type="hidden" {...register(`variants.${index}.id`)} />
            <label className="field"><span>SKU</span><input placeholder="CHARGER-65W-UK" {...register(`variants.${index}.sku`)} />{errors.variants?.[index]?.sku ? <small>{errors.variants[index]?.sku?.message}</small> : null}</label>
            <label className="field"><span>Option / configuration</span><input placeholder="65W · UK plug" {...register(`variants.${index}.size`)} /></label>
            <label className="field"><span>Finish / color</span><input placeholder="Graphite" {...register(`variants.${index}.color`)} /></label>
            <label className="field"><span>Price override</span><input type="number" min="0" step="0.01" placeholder="Use base price" {...register(`variants.${index}.price`, { setValueAs: (value) => value === '' ? undefined : Number(value) })} /></label>
            <label className="field"><span>Stock</span><input type="number" min="0" step="1" {...register(`variants.${index}.stock`, { valueAsNumber: true })} />{errors.variants?.[index]?.stock ? <small>{errors.variants[index]?.stock?.message}</small> : null}</label>
            <label className="field variant-image"><span>Variant image</span><input list="product-image-urls" placeholder="Choose an uploaded image or paste URL" {...register(`variants.${index}.image`)} /></label>
            <button type="button" className="icon-button icon-button--danger variant-remove" onClick={() => variants.remove(index)} title="Remove variant"><Trash2 size={16} /></button>
          </div>)}
        </div> : <p className="form-hint">No configurations. The product-level stock field will be used.</p>}
      </div>

      <label className="switch-row"><input type="checkbox" {...register('isActive')} /><span className="switch" /><div><strong>Active listing</strong><span>Visible and available for purchase on the storefront.</span></div></label>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" isLoading={isSubmitting || uploading} disabled={uploading}>{product ? 'Save changes' : 'Create product'}</Button></div>
    </form>
  );
}
