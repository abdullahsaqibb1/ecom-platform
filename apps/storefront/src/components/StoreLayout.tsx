import { Outlet, ScrollRestoration } from 'react-router-dom';
import { AnnouncementBar } from './AnnouncementBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';

export function StoreLayout() {
  return <><AnnouncementBar /><Header /><main><Outlet /></main><Footer /><CartDrawer /><ScrollRestoration /></>;
}
