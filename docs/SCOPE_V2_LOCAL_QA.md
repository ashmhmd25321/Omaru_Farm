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
cd backend && npm run check
cd frontend && npm run build
```

## Manual store
- [ ] Add product to cart from Store modal
- [ ] Cart page quantity / remove
- [ ] Checkout quote changes when postcode / pickup changes
- [ ] Stripe test card `4242 4242 4242 4242` pays successfully
- [ ] Declined card `4000 0000 0000 0002` shows error
- [ ] Admin → Orders shows paid order; stock decreased
- [ ] Admin → Shipping rules editable

## Manual café / stays / accounts
- [ ] Café booking creates table hold (Admin → Table holds), expires after 24h logic
- [ ] Stay panel quotes nights; unavailable dates rejected
- [ ] Admin → Stays: set iCal URLs + Sync iCal
- [ ] Manual block-out prevents checkout
- [ ] Register / login at `/account`
- [ ] Saved card SetupIntent flow (test mode)
- [ ] Sales tab totals update

## Contabo (Phase 6)
Only after checklist above is green. Set live Stripe keys + webhook URL `https://omarufarms.com.au/api/stripe/webhook`, rebuild containers, smoke one test purchase.
