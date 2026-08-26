# Scope V2 — Local QA checklist

## Prerequisites
1. MySQL + backend running (`npm run dev` in `backend/`, DB reachable).
2. Frontend: `npm run dev` in `frontend/`.
3. Optional Stripe test keys in `backend/.env`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_PUBLISHABLE_KEY=pk_test_...`
4. Webhooks (when testing payments):
   ```bash
   stripe listen --forward-to localhost:4000/api/stripe/webhook
   ```
   Copy `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

## Automated
```bash
cd backend && node scripts/shipping.selftest.js
cd backend && npm run qa:phase04
cd backend && npm run check
cd frontend && npm run build
```

`npm run qa:phase04` covers Scope V2 Phase 04 API checks: store quote (delivery vs pickup), declined card, admin orders/sales/shipping rules, Airbnb + manual stay blocks, iCal sync, café table holds, account SetupIntent vaulting.

## Manual store
- [x] Add product to cart from Store modal *(smoke-tested earlier)*
- [x] Cart page quantity / remove *(smoke-tested earlier)*
- [x] Checkout quote changes when postcode / pickup changes *(API + cart UI)*
- [x] Stripe test card `4242 4242 4242 4242` pays successfully *(order OF-MT9H7TQ8-2953)*
- [x] Declined card `4000 0000 0000 0002` shows error *(API: `pm_card_chargeDeclined`)*
- [x] Admin → Orders shows paid order; stock decreased
- [x] Admin → Shipping rules editable

## Manual café / stays / accounts
- [x] Café booking creates table hold (Admin → Table holds), expires after 24h logic
- [x] Stay panel quotes nights; unavailable dates rejected
- [x] Admin → Stays: set iCal URLs + Sync iCal
- [x] Manual block-out prevents checkout
- [x] Register / login at `/account`
- [x] Saved card SetupIntent flow (test mode)
- [x] Sales tab totals update

## Contabo (Phase 05 / production)
Only after checklist above is green. Set live Stripe keys + webhook URL `https://omarufarms.com.au/api/stripe/webhook`, rebuild containers, smoke one test purchase.
