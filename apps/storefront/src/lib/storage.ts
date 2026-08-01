const CUSTOMER_TOKEN_KEY = 'ecom.customer.accessToken';
const CART_KEY = 'ecom.customer.cart';

export const customerTokenStorage = {
  get: () => localStorage.getItem(CUSTOMER_TOKEN_KEY),
  set: (token: string) => localStorage.setItem(CUSTOMER_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(CUSTOMER_TOKEN_KEY),
};

export const cartStorage = {
  get: () => localStorage.getItem(CART_KEY),
  set: (value: string) => localStorage.setItem(CART_KEY, value),
  clear: () => localStorage.removeItem(CART_KEY),
};
