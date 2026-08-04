import { useParams } from 'react-router-dom';

const content: Record<string, { title: string; body: string[] }> = {
  about: { title: 'Our approach', body: ['Cosmic Tech focuses on useful everyday technology: clear compatibility, practical performance and products that fit naturally into how people listen, charge and connect.', 'This page is ready to be managed through a future content module in the admin dashboard.'] },
  shipping: { title: 'Shipping', body: ['Delivery timings and charges should be configured to match your courier and operational policy.', 'Orders can be followed from the customer account after purchase.'] },
  returns: { title: 'Returns & exchanges', body: ['Add the final return window, eligibility rules, exchange process, warranty exclusions and refund policy here.'] },
  'size-guide': { title: 'Compatibility guide', body: ['Check the connector, power rating, device model and charging standard before ordering.', 'Product variants are used for options such as cable length, connector type, plug type, power output, capacity, finish or device compatibility.'] },
  contact: { title: 'Customer care', body: ['Add WhatsApp, email, phone and service hours here. Compatibility questions should include the customer device model and the product they are considering.'] },
};

export function ContentPage() {
  const { slug = 'about' } = useParams();
  const page = content[slug] ?? content.about;
  return <section className="content-page"><p className="eyebrow">Information</p><h1>{page.title}</h1>{page.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>;
}
