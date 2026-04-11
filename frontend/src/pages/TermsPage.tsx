import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

/**
 * Starter terms for the website. Replace with advice from a qualified lawyer
 * before relying on this for compliance (especially for AU consumers & bookings).
 */
export function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms of use | Omaru Farm</title>
        <meta name="description" content="Terms of use for the Omaru Farm website, bookings, and enquiries." />
      </Helmet>

      <main className="mx-auto max-w-3xl px-5 py-14 md:py-16">
        <p className="text-xs uppercase tracking-[0.28em] text-gold/75">Legal</p>
        <h1 className="mt-3 font-heading text-4xl text-charcoal md:text-5xl">Terms of use</h1>
        <p className="mt-2 text-sm text-white/50">Last updated: {new Date().getFullYear()}</p>

        <div className="mt-8 rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm leading-relaxed text-stone">
          <strong className="text-gold/90">Important:</strong> This page is a general template for a small farm hospitality business. Have it reviewed
          by a lawyer so it matches how you actually operate (bookings, payments, cancellations, and Australian consumer law).
        </div>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-white/72 md:text-base">
          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">1. Agreement</h2>
            <p className="mt-3">
              By using this website you agree to these terms. If you do not agree, please do not use the site.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">2. Information on this site</h2>
            <p className="mt-3">
              We aim to keep menus, products, prices, and opening hours accurate, but they may change with the season. Images and descriptions are
              for guidance only.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">3. Enquiries &amp; bookings</h2>
            <p className="mt-3">
              Forms and messages on this site are <strong className="text-bark">requests only</strong> until we confirm by email or phone.
              Availability, pricing, and house rules apply to café visits, stays, and events.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">4. Products &amp; store</h2>
            <p className="mt-3">
              Product availability and pack sizes may vary. We may refuse or cancel an order where stock is unavailable or there is an obvious
              pricing error, and we will contact you if that happens.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">5. Intellectual property</h2>
            <p className="mt-3">
              Text, images, logos, and design on this site belong to Omaru Farm or our licensors. Do not copy or reuse them without permission.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">6. Liability</h2>
            <p className="mt-3">
              To the extent permitted by law, we are not liable for loss arising from use of this site, third-party links, or events beyond our
              reasonable control. Nothing here limits rights you have under the Australian Consumer Law.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">7. Contact</h2>
            <p className="mt-3">
              Questions about these terms?{' '}
              <Link to="/contact" className="text-gold underline-offset-4 hover:underline">
                Contact us
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </>
  )
}
