import { Link } from 'react-router-dom';

const storeName = import.meta.env.VITE_STORE_NAME ?? 'ATELIER';

export function Footer() {
  return (
    <footer className="site-footer">
      <section className="newsletter"><div><p className="eyebrow">Private list</p><h2>New edits, considered releases.</h2></div><form onSubmit={(e) => e.preventDefault()}><input type="email" placeholder="Email address" aria-label="Email address" /><button>Subscribe</button></form></section>
      <div className="footer-grid">
        <div><Link className="footer-wordmark" to="/">{storeName}</Link><p>Modern wardrobe essentials, made for everyday movement.</p></div>
        <div><h3>Shop</h3><Link to="/collections/new">New arrivals</Link><Link to="/collections/women">Women</Link><Link to="/collections/men">Men</Link><Link to="/collections/footwear">Footwear</Link></div>
        <div><h3>Help</h3><Link to="/pages/shipping">Shipping</Link><Link to="/pages/returns">Returns & exchanges</Link><Link to="/pages/size-guide">Size guide</Link><Link to="/pages/contact">Contact</Link></div>
        <div><h3>Visit</h3><p>Lahore · Karachi · Islamabad</p><p>Monday–Saturday<br />9:00–21:00 PKT</p></div>
      </div>
      <div className="footer-bottom"><span>© 2026 {storeName}</span><span>Privacy · Terms</span></div>
    </footer>
  );
}
