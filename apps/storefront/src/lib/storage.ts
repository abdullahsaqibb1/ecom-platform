const CUSTOMER_CSRF_KEY = 'cosmic.customer.csrf';
const LEGACY_CUSTOMER_TOKEN_KEY = 'ecom.customer.accessToken';
const CART_KEY = 'ecom.customer.cart';

export const customerSecurityStorage = {
  getCsrf: () => sessionStorage.getItem(CUSTOMER_CSRF_KEY),
  setCsrf: (token: string) => sessionStorage.setItem(CUSTOMER_CSRF_KEY, token),
  clear: () => {
    sessionStorage.removeItem(CUSTOMER_CSRF_KEY);
    localStorage.removeItem(LEGACY_CUSTOMER_TOKEN_KEY);
  },
};

export const cartStorage = {
  get: () => localStorage.getItem(CART_KEY),
  set: (value: string) => localStorage.setItem(CART_KEY, value),
  clear: () => localStorage.removeItem(CART_KEY),
};
