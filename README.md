# Omaru Farm Website (Custom Stack)

Modern full-stack website for Omaru Farm using:
- Frontend: React + TypeScript + Vite + Tailwind + shadCN-style UI components
- Backend: Express.js + MySQL

## Project Structure

- `frontend` - warm, light, premium farm-to-table destination UI
- `backend` - REST API for products, bookings, and reviews
- `Farm_images` - source hero/brand images used in frontend public assets
- `Farm Store products 2026` - source product images used in frontend public assets

## Run Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Run Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Database Setup

1. Create a MySQL database and user.
2. Update `backend/.env` credentials.
3. Run:

```bash
mysql -u root -p < backend/schema.sql
```

Backend API base URL: `http://localhost:4000`

## Docker (Frontend + Backend + MySQL)

This project is dockerized with:
- `frontend` (Vite build served by Nginx)
- `backend` (Express API)
- `db` (MySQL 8)
- shared uploads volume (`/images/uploads/*`)

### 1) Create Docker env file

```bash
cp .env.docker.example .env
```

Edit `.env` values before starting. Production-like runs require:

- `ADMIN_PASSWORD` — at least 12 characters
- `ADMIN_JWT_SECRET` — at least 32 characters
- `CORS_ORIGIN` — allowed frontend origin, for example `https://omarufarms.com.au`
- `PUBLIC_SITE_URL` — canonical public site URL
- `COOKIE_SECURE=true` when serving admin over HTTPS

### 2) Build and start

```bash
docker compose up --build -d
```

### 3) Open app

- Website/Admin: `http://localhost:5173`
- API health: `http://localhost:4000/api/health`

### 4) Stop

```bash
docker compose down
```

To remove DB/upload volumes too:

```bash
docker compose down -v
```

### Align existing CMS data

If an older database was seeded before the current address, hours, and lunch/dinner menu changes, run:

```bash
cd backend
npm run align:live-data
```

This updates contact details/hours and hides legacy Breakfast or Afternoon Tea menu rows without deleting historical records.

## Free Hosting Options

### Production deployment note

This app is **not** a static-only website. Bookings, admin, menu/products, media uploads, and site settings all require the Express API and MySQL database. The GitHub Actions workflow now runs build checks only; it does **not** deploy to GitHub Pages because GitHub Pages cannot run the backend.

For the client-facing site, deploy the Docker stack (`frontend` + `backend` + `db`) behind HTTPS. In production set:

- `CORS_ORIGIN=https://your-domain`
- `PUBLIC_SITE_URL=https://your-domain`
- `COOKIE_SECURE=true`
- strong `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, `DB_PASSWORD`, and `DB_ROOT_PASSWORD`

### Option A (recommended for full-stack + Docker): Oracle Cloud Always Free VM

Why:
- Truly free long-term VM tier
- Full Docker Compose support (frontend + backend + MySQL in one host)
- Best match for your current architecture

High-level:
1. Push this repo to GitHub.
2. Create an Oracle Always Free Ubuntu VM.
3. Install Docker + Docker Compose plugin.
4. Clone repo on VM, create `.env`, run `docker compose up -d --build`.
5. Point your domain/subdomain to the VM public IP.

### Option B (frontend only): GitHub Pages

Good for design-only preview only. It is **not valid for the client-facing production site** unless the backend is hosted separately and the frontend is built with `VITE_API_BASE_URL` pointing to that hosted API.

### Option C (split services): Render/Railway/etc

Possible, but free tiers usually sleep or have limits. Also MySQL free plans are less predictable than running MySQL in your own free VM.

## Included API Endpoints

- `GET /api/health`
- `GET /api/products`
- `GET /api/product-categories`
- `GET /api/testimonials`
- `GET /api/menu`
- `GET /api/content/about`
- `GET /api/content/contact`
- `GET /api/content/site-settings`
- `POST /api/bookings`
