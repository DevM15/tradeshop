# TradeShop

TradeShop is a Next.js App Router project featuring a simple e‑commerce backend (Products, Orders, Auth) and an admin/user dashboard. It implements JWT authentication, role-based access control, server-side validation with Zod, and MongoDB persistence via Mongoose.

**Key Features**

- **Auth**: Register and login with JWT issuance.
- **RBAC**: `admin` and `user` roles enforced via middleware.
- **Products**: List (public GET), create, update, delete (admin only).
- **Orders**: Create orders (user only) with stock checks and total price calculation.
- **Dashboard**: Admin can add/edit/delete products; User can purchase products.

**Tech Stack**

- **Next.js 16 (App Router)**, **React 19**, **TypeScript**
- **MongoDB + Mongoose**
- **JWT** via `jose`/`jsonwebtoken`
- **Validation** via `zod`
- **bcryptjs** for password hashing

---

## Getting Started

**Prerequisites**

- Node.js 18+ (LTS recommended)
- A MongoDB connection string

**Environment Variables** (create `.env` in project root)

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for signing JWTs
- `JWT_EXPIRES_IN` (optional): e.g. `7d`

**Install & Run**

```bash
npm install
npm run dev
```

Visit http://localhost:3000

**Scripts**

- `npm run dev`: Start development server
- `npm run build`: Build production bundle
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

---

## Project Structure

- `app/`: Next.js App Router pages and API routes
  - `app/api/v1/auth/login/route.ts`: Login
  - `app/api/v1/auth/register/route.ts`: Register
  - `app/api/v1/products/route.ts`: List products (GET), Create product (POST)
  - `app/api/v1/products/[id]/route.ts`: Update (PUT), Delete (DELETE)
  - `app/api/v1/orders/route.ts`: Create order (POST)
- `lib/`:
  - `db.ts`: Mongoose connection
  - `jwt.ts`: Token signing & verification
  - `auth.ts`: Helper to verify bearer token (used in some contexts)
  - `requireRole.ts`: Role enforcement using headers injected by middleware
- `models/`:
  - `User.ts`, `Product.ts`, `Order.ts`: Mongoose models
- `validators/`:
  - Zod schemas for auth, product, order payloads
- `middleware.ts`: Secures `/api/v1/*`; allows public GET `/api/v1/products`

---

## Authentication & Middleware

- All `/api/v1/*` routes are matched by `middleware.ts`.
- Public endpoints: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, and `GET /api/v1/products`.
- Other endpoints require a `Bearer <token>` header.
- Middleware verifies JWT and injects `x-user-id` and `x-user-role` into request headers for downstream handlers.

---

## API Reference

### Auth

- **POST /api/v1/auth/register**

  - Body: `{ name, email, password, role? }`
  - Returns: `201 Created` on success

- **POST /api/v1/auth/login**
  - Body: `{ email, password }`
  - Returns: `{ token, role }`

### Products

- **GET /api/v1/products** (public)

  - Query: `page` (default 1), `limit` (default 10)
  - Returns: `{ data: Product[], meta: { page, limit, total, totalPages } }`

- **POST /api/v1/products** (admin)

  - Auth: `Bearer <token>` with `role=admin`
  - Body: `{ name, description, price, stock }`
  - Returns: `201 Created` with created product

- **PUT /api/v1/products/:id** (admin)

  - Auth: `Bearer <token>` with `role=admin`
  - Body: Partial update `{ name?, description?, price?, stock? }`
  - Returns: updated product

- **DELETE /api/v1/products/:id** (admin)
  - Auth: `Bearer <token>` with `role=admin`
  - Returns: `200 OK` on deletion

### Orders

- **POST /api/v1/orders** (user)
  - Auth: `Bearer <token>` with `role=user`
  - Body: `{ productId, quantity }`
  - Behavior: Checks stock, decrements on success, returns `{ success: true, orderId }`

---

## Data Models (Summary)

- **User**: `{ name, email, password(hash), role: 'user'|'admin' }`
- **Product**: `{ name, description, price, stock, createdBy }` with timestamps
- **Order**: `{ userId, productId, quantity, totalPrice, status }` with timestamps

---

## Frontend (Pages)

- **/login**: Email/password login; stores token+role in localStorage
- **/register**: Create account (user or admin)
- **/dashboard**:
  - Shows product list
  - **User**: Choose quantity and buy
  - **Admin**: Add product; Edit product via modal overlay; Delete product
  - Edit modal supports close via button, backdrop click, and Escape key; prevents background scrolling while open

---

## Development Notes

- Validation via Zod in `validators/*`
- Role gating via `requireRole()` powered by `middleware.ts` injected headers
- MongoDB connection is cached to avoid reconnections across requests
- Linting via ESLint; TypeScript enabled

---

## Quick Test (cURL)

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
	-H "Content-Type: application/json" \
	-d '{"name":"Admin","email":"admin@example.com","password":"secret","role":"admin"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
	-H "Content-Type: application/json" \
	-d '{"email":"admin@example.com","password":"secret"}' | jq -r .token)

# Create product (admin)
curl -X POST http://localhost:3000/api/v1/products \
	-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
	-d '{"name":"Item","description":"Nice","price":9.99,"stock":10}'
```

---

## License

Proprietary. Internal project.
