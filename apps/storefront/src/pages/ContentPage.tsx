import { useParams } from 'react-router-dom';

const content: Record<string, { title: string; body: string[] }> = {
  about: { title: 'Our story', body: ['We design a modern wardrobe around repetition: pieces that feel easy to return to and considered enough to keep.', 'This page is ready to be managed through a future content module in the admin dashboard.'] },
  shipping: { title: 'Shipping', body: ['Delivery timings and charges should be configured to match your courier and operational policy.', 'Orders can be followed from the customer account after purchase.'] },
  returns: { title: 'Returns & exchanges', body: ['Add the final return window, eligibility rules, exchange process and refund policy here.'] },
  'size-guide': { title: 'Size guide', body: ['The storefront supports product-level size selectors and a size guide modal. The final measurements can be saved per category or per product.'] },
  contact: { title: 'Customer care', body: ['Add WhatsApp, email, phone and physical store details here.'] },
};

export function ContentPage() {
  const { slug = 'about' } = useParams();
  const page = content[slug] ?? content.about;
  return <section className="content-page"><p className="eyebrow">Information</p><h1>{page.title}</h1>{page.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>;
}
