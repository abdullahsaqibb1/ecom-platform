import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useStorefrontConfig } from '../lib/storefront-config';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { itemCount, openCart } = useCart();
  const { user } = useAuth();
  const { settings } = useStorefrontConfig();
  const navigate = useNavigate();
  const links = settings.navigation.filter((item) => item.isVisible !== false);

  useEffect(() => { document.body.style.overflow = menuOpen || searchOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [menuOpen, searchOpen]);
  const submitSearch = (event: FormEvent) => { event.preventDefault(); if (!query.trim()) return; setSearchOpen(false); navigate(`/collections/all?search=${encodeURIComponent(query.trim())}`); };
  const brand = settings.logoUrl ? <img className="header-logo" src={settings.logoUrl} alt={settings.logoAlt || settings.siteName} /> : settings.siteName;

  return <>
    <header className="site-header">
      <button className="mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
      <nav className="desktop-nav">{links.slice(0, 3).map((item) => <NavLink key={`${item.href}-${item.label}`} to={item.href}>{item.label}</NavLink>)}</nav>
      <Link to="/" className={`wordmark ${settings.logoUrl ? 'wordmark--image' : ''}`}>{brand}</Link>
      <div className="header-actions"><button onClick={() => setSearchOpen(true)} aria-label="Search"><Search /></button><Link to={user ? '/account' : '/login'} aria-label="Account"><UserRound /></Link><button onClick={openCart} aria-label="Cart" className="bag-button"><ShoppingBag /><span>{itemCount}</span></button></div>
    </header>
    <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}><div className="mobile-menu-head"><span className={`wordmark ${settings.logoUrl ? 'wordmark--image' : ''}`}>{brand}</span><button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div><nav>{links.map((item) => <NavLink key={`${item.href}-${item.label}`} to={item.href} onClick={() => setMenuOpen(false)}>{item.label}<span>→</span></NavLink>)}</nav><div className="mobile-menu-foot"><Link to={user ? '/account' : '/login'} onClick={() => setMenuOpen(false)}>{user ? 'My account' : 'Sign in'}</Link><Link to="/pages/contact" onClick={() => setMenuOpen(false)}>Customer care</Link></div></div>
    <div className={`search-overlay ${searchOpen ? 'open' : ''}`}><button className="search-close" onClick={() => setSearchOpen(false)} aria-label="Close search"><X /></button><form onSubmit={submitSearch}><label htmlFor="site-search">What are you looking for?</label><div><input id="site-search" autoFocus={searchOpen} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search earbuds, chargers, cables…" /><button type="submit" aria-label="Submit search"><Search /></button></div></form></div>
  </>;
}
