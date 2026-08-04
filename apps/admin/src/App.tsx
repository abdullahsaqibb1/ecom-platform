import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminsPage } from './features/admins/AdminsPage';
import { CategoriesPage } from './features/categories/CategoriesPage';
import { CollectionsPage } from './features/collections/CollectionsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { DiscountsPage } from './features/discounts/DiscountsPage';
import { InventoryPage } from './features/inventory/InventoryPage';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { OrdersPage } from './features/orders/OrdersPage';
import { PaymentMethodsPage } from './features/payments/PaymentMethodsPage';
import { ProductsPage } from './features/products/ProductsPage';
import { StorefrontPage } from './features/storefront/StorefrontPage';
import { AdminLayout } from './layouts/AdminLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="discounts" element={<DiscountsPage />} />
        <Route path="payments" element={<PaymentMethodsPage />} />
        <Route path="storefront" element={<StorefrontPage />} />
        <Route path="admins" element={<AdminsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
