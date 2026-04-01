# Omaru Farm Website Development Phases

## Finalized Technology Stack
- `Next.js` (App Router) + `TypeScript`
- `Tailwind CSS`
- `MySQL` + `Prisma ORM`
- `NextAuth` (admin authentication)
- `Resend` (booking/contact notifications)
- `Cloudinary` (image optimization and hosting)
- `Vercel` deployment (or Node-capable existing host)

## Phase 1: Discovery and Content Structuring
- Confirm final sitemap: Home, About, Cafe, Stay, Farm Store, Contact, Booking
- Finalize copy, contact details, and booking rules
- Clean and normalize product list data (name, category, size, price, image)
- Select and tag core images from `Farm Store products 2026`

## Phase 2: Visual Direction and Design System
- Capture brand colors from the reference site and define theme tokens
- Define typography, spacing, button styles, and card styles
- Create reusable layout patterns for desktop, tablet, and mobile
- Produce page-level wireframes for conversion-focused UX

## Phase 3: SEO and Information Architecture
- Define SEO keywords per page and map to intent
- Set URL structure and internal linking strategy
- Prepare metadata templates (title, description, OG)
- Plan structured data (`LocalBusiness`, `Product`, `FAQ`)

## Phase 4: Project Setup and Foundation
- Initialize Next.js project with TypeScript and Tailwind
- Configure Prisma + MySQL connection and baseline schema
- Establish folder architecture and coding conventions
- Add environment variable templates and base scripts

## Phase 5: Core Frontend Development
- Build shared components: Navbar, Footer, CTA blocks, section shells
- Build core pages with responsive layout and theme consistency
- Add WhatsApp floating action and booking CTAs
- Integrate optimized image loading and content sections

## Phase 6: Booking, Forms, and Business Features
- Cafe booking form with validation and email notifications
- Accommodation inquiry/booking request flow
- Contact form with spam protection and admin notifications
- Direct bank transfer booking states (pending, verified, confirmed)

## Phase 7: Farm Store and Content Management
- Build product catalog pages with categories and filters
- Create admin-only CRUD flows for products, bookings, and reviews
- Implement secure admin authentication and role protection
- Add basic analytics events (bookings, form submissions, WhatsApp clicks)

## Phase 8: QA, Accessibility, and Performance
- Run cross-browser and device testing
- Validate complete booking and contact flows
- Improve Lighthouse scores (performance, SEO, accessibility)
- Fix keyboard navigation, contrast, and semantic markup issues

## Phase 9: Launch and Iteration
- Configure production environment and domain mapping
- Submit sitemap and verify Search Console
- Set up monitoring and issue triage
- Plan post-launch iterations from user behavior data

## Immediate Next Build Steps
1. Scaffold Next.js project (`omaru-farm-web`).
2. Configure Prisma for MySQL and create initial schema.
3. Implement base layout with Omaru Farm brand theme.
4. Build Home page first (hero, highlights, booking CTAs).
