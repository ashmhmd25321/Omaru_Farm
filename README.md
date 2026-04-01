# Omaru Farm Website (Custom Stack)

Modern full-stack website for Omaru Farm using:
- Frontend: React + TypeScript + Vite + Tailwind + shadCN-style UI components
- Backend: Express.js + MySQL

## Project Structure

- `frontend` - premium black/gold/white farm-to-table themed UI
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

## Included API Endpoints

- `GET /api/health`
- `GET /api/products`
- `GET /api/reviews`
- `POST /api/bookings`
- `POST /api/reviews`
