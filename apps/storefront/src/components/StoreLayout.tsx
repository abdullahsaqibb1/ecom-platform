import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnnouncementBar } from './AnnouncementBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  }, [pathname]);

  return null;
}

export function StoreLayout() {
  return (
    <>
      <ScrollToTop />
      <AnnouncementBar />
      <Header />

      <main>
        <Outlet />
      </main>

      <Footer />
      <CartDrawer />
    </>
  );
}
