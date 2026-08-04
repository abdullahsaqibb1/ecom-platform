import { Navigate, Route, Routes } from 'react-router-dom';
import { StoreLayout } from './components/StoreLayout';
import { HomePage } from './pages/HomePage';
import { CollectionPage } from './pages/CollectionPage';
import { ProductPage } from './pages/ProductPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { AccountPage } from './pages/AccountPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ContentPage } from './pages/ContentPage';
import { CartPage } from './pages/CartPage';
import { PaymentCancelledPage, PaymentSuccessPage } from './pages/PaymentResultPages';

export default function App() {
  return <Routes><Route element={<StoreLayout />}><Route index element={<HomePage />} /><Route path="collections/:slug" element={<CollectionPage />} /><Route path="products/:idOrSlug" element={<ProductPage />} /><Route path="cart" element={<CartPage />} /><Route path="checkout" element={<CheckoutPage />} /><Route path="checkout/success" element={<PaymentSuccessPage />} /><Route path="checkout/cancelled" element={<PaymentCancelledPage />} /><Route path="login" element={<LoginPage />} /><Route path="register" element={<RegisterPage />} /><Route path="account" element={<AccountPage />} /><Route path="pages/:slug" element={<ContentPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes>;
}
