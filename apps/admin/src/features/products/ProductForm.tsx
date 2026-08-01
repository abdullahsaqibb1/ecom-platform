import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../../components/Button';
import type { Category, Product } from '../../types/domain';

const optionalPrice = z.number().nonnegative().optional();

const schema = z.object({
  name: z.string().min(2, 'Name is required.').max(120),
  description: z.string().min(10, 'Add a useful description.'),
  price: z.number().nonnegative('Price cannot be negative.'),
  stock: z.number().int().nonnegative('Stock cannot be negative.'),
  categoryId: z.string().optional(),
  isActive: z.boolean(),
  images: z.array(z.object({ url: z.union([z.literal(''), z.string().url('Enter a valid image URL.')]) })).max(8),
  variants: z.array(z.object({
    id: z.string().optional(),
    sku: z.string().min(2, 'SKU is required.').max(100),
    size: z.string().max(40).optional(),
    color: z.string().max(60).optional(),
    price: optionalPrice,
    stock: z.number().int().nonnegative('Stock cannot be negative.'),
    image: z.union([z.literal(''), z.string().url('Enter a valid image URL.')]).optional(),
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
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', description: '', price: 0, stock: 0, categoryId: '', isActive: true,
      images: [{ url: '' }], variants: [],
    },
  });
  const images = useFieldArray({ control, name: 'images' });
  const variants = useFieldArray({ control, name: 'variants', keyName: '_key' });
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
  }, [product, reset]);

  return (
    <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-grid">
        <label className="field field--wide"><span>Product name</span><input placeholder="Premium linen shirt" {...register('name')} />{errors.name ? <small>{errors.name.message}</small> : null}</label>
        <label className="field"><span>Base price</span><div className="input-prefix"><span>Rs</span><input type="number" min="0" step="0.01" {...register('price', { valueAsNumber: true })} /></div>{errors.price ? <small>{errors.price.message}</small> : null}</label>
        <label className="field"><span>{watchedVariants.length ? 'Total variant stock' : 'Stock'}</span>{watchedVariants.length ? <input type="number" value={variantStock} disabled /> : <input type="number" min="0" step="1" {...register('stock', { valueAsNumber: true })} />}{errors.stock ? <small>{errors.stock.message}</small> : null}</label>
        <label className="field field--wide"><span>Category</span><select {...register('categoryId')}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="field field--wide"><span>Description</span><textarea rows={5} placeholder="Describe the product, materials, sizing, and key details." {...register('description')} />{errors.description ? <small>{errors.description.message}</small> : null}</label>
      </div>

      <div className="form-section">
        <div className="form-section__header"><div><strong>Product images</strong><span>Use hosted image URLs until Cloudinary or S3 uploads are connected.</span></div><Button type="button" variant="secondary" size="sm" onClick={() => images.append({ url: '' })}><Plus size={15} /> Add URL</Button></div>
        <div className="image-url-list">{images.fields.map((field, index) => <div key={field.id}><input placeholder="https://cdn.example.com/product.jpg" {...register(`images.${index}.url`)} /><button type="button" className="icon-button" onClick={() => images.remove(index)} disabled={images.fields.length === 1}><Trash2 size={16} /></button>{errors.images?.[index]?.url ? <small>{errors.images[index]?.url?.message}</small> : null}</div>)}</div>
      </div>

      <div className="form-section">
        <div className="form-section__header"><div><strong>Size and color variants</strong><span>Each combination has its own SKU, price override, and inventory.</span></div><Button type="button" variant="secondary" size="sm" onClick={() => variants.append({ sku: '', size: '', color: '', price: undefined, stock: 0, image: '' })}><Plus size={15} /> Add variant</Button></div>
        {variants.fields.length ? <div className="variant-editor">
          {variants.fields.map((field, index) => <div className="variant-row" key={field._key}>
            <input type="hidden" {...register(`variants.${index}.id`)} />
            <label className="field"><span>SKU</span><input placeholder="SHIRT-BLK-M" {...register(`variants.${index}.sku`)} />{errors.variants?.[index]?.sku ? <small>{errors.variants[index]?.sku?.message}</small> : null}</label>
            <label className="field"><span>Size</span><input placeholder="M" {...register(`variants.${index}.size`)} /></label>
            <label className="field"><span>Color</span><input placeholder="Black" {...register(`variants.${index}.color`)} /></label>
            <label className="field"><span>Price override</span><input type="number" min="0" step="0.01" placeholder="Use base price" {...register(`variants.${index}.price`, { setValueAs: (value) => value === '' ? undefined : Number(value) })} /></label>
            <label className="field"><span>Stock</span><input type="number" min="0" step="1" {...register(`variants.${index}.stock`, { valueAsNumber: true })} />{errors.variants?.[index]?.stock ? <small>{errors.variants[index]?.stock?.message}</small> : null}</label>
            <label className="field variant-image"><span>Variant image URL</span><input placeholder="Optional" {...register(`variants.${index}.image`)} /></label>
            <button type="button" className="icon-button icon-button--danger variant-remove" onClick={() => variants.remove(index)} title="Remove variant"><Trash2 size={16} /></button>
          </div>)}
        </div> : <p className="form-hint">No variants. The product-level stock field will be used.</p>}
      </div>

      <label className="switch-row"><input type="checkbox" {...register('isActive')} /><span className="switch" /><div><strong>Active listing</strong><span>Visible and available for purchase on the storefront.</span></div></label>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" isLoading={isSubmitting}>{product ? 'Save changes' : 'Create product'}</Button></div>
    </form>
  );
}
