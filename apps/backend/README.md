# E-commerce Backend

Express API for Vercel with Prisma/PostgreSQL.

## Main commands

```bash
npm install
npm run dev
npm run db:deploy
npm run db:seed
npm run db:reset-admin
```

## API groups

### Public/customer

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/:idOrSlug`
- `POST /api/orders`
- `GET /api/orders`

### Admin

- `POST /api/admin/auth/login`
- `GET /api/admin/me`
- `GET|POST /api/admin/admins` (superadmin)
- `GET|POST /api/admin/categories`
- `DELETE /api/admin/categories/:id`
- `GET|POST /api/admin/products`
- `PUT|PATCH|DELETE /api/admin/products/:id`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/status`
