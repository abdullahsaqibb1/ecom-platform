const currency = import.meta.env.VITE_CURRENCY ?? 'PKR';

export function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(value: number | string | null | undefined): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

export function productPath(product: { id: string; slug?: string }): string {
  return `/products/${product.slug || product.id}`;
}
