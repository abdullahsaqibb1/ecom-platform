import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const storeName = import.meta.env.VITE_STORE_NAME ?? 'ATELIER';
const links = [
  ['New', '/collections/new'],
  ['Women', '/collections/women'],
  ['Men', '/collections/men'],
  ['Footwear', '/collections/footwear'],
  ['Accessories', '/collections/accessories'],
] as const;

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { itemCount, openCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { document.body.style.overflow = menuOpen || searchOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [menuOpen, searchOpen]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setSearchOpen(false);
    navigate(`/collections/all?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      <header className="site-header">
        <button className="mobile-menu-button" onClick={() => setMenuOpen(true)}><Menu /></button>
        <nav className="desktop-nav">{links.slice(0, 3).map(([label, href]) => <NavLink key={href} to={href}>{label}</NavLink>)}</nav>
        <Link to="/" className="wordmark">{storeName}</Link>
        <div className="header-actions">
          <button onClick={() => setSearchOpen(true)} aria-label="Search"><Search /></button>
          <Link to={user ? '/account' : '/login'} aria-label="Account"><UserRound /></Link>
          <button onClick={openCart} aria-label="Cart" className="bag-button"><ShoppingBag /><span>{itemCount}</span></button>
        </div>
      </header>
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-head"><span className="wordmark">{storeName}</span><button onClick={() => setMenuOpen(false)}><X /></button></div>
        <nav>{links.map(([label, href]) => <NavLink key={href} to={href} onClick={() => setMenuOpen(false)}>{label}<span>→</span></NavLink>)}</nav>
        <div className="mobile-menu-foot"><Link to={user ? '/account' : '/login'} onClick={() => setMenuOpen(false)}>{user ? 'My account' : 'Sign in'}</Link><Link to="/pages/contact" onClick={() => setMenuOpen(false)}>Customer care</Link></div>
      </div>
      <div className={`search-overlay ${searchOpen ? 'open' : ''}`}>
        <button className="search-close" onClick={() => setSearchOpen(false)}><X /></button>
        <form onSubmit={submitSearch}><label htmlFor="site-search">What are you looking for?</label><div><input id="site-search" autoFocus={searchOpen} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" /><button type="submit"><Search /></button></div></form>
      </div>
    </>
  );
}
