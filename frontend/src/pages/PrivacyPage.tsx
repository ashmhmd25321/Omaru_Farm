import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

/**
 * Starter privacy notice. Replace with a policy that matches your real data practices
 * and legal obligations (e.g. Privacy Act 1988 (Cth), APPs) after professional review.
 */
export function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy policy | Omaru Farm</title>
        <meta name="description" content="How Omaru Farm collects, uses, and protects your personal information." />
      </Helmet>

      <main className="mx-auto max-w-3xl px-5 py-14 md:py-16">
        <p className="text-xs uppercase tracking-[0.28em] text-gold/75">Legal</p>
        <h1 className="mt-3 font-heading text-4xl text-charcoal md:text-5xl">Privacy policy</h1>
        <p className="mt-2 text-sm text-white/50">Last updated: {new Date().getFullYear()}</p>

        <div className="mt-8 rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm leading-relaxed text-stone">
          <strong className="text-gold/90">Important:</strong> This is a starting outline only. Update it to reflect what you actually collect (e.g.
          newsletter, analytics, payment providers) and get legal advice if you operate in Australia.
        </div>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-white/72 md:text-base">
          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">Who we are</h2>
            <p className="mt-3">
              Omaru Farm (&quot;we&quot;, &quot;us&quot;) operates this website. For privacy questions, use the details on our{' '}
              <Link to="/contact" className="text-gold underline-offset-4 hover:underline">
                contact page
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">What we collect</h2>
            <p className="mt-3">We may collect information you choose to give us, for example:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-white/68">
              <li>Name and email when you send a message or booking request</li>
              <li>Other details you include in your message (e.g. dates, dietary notes)</li>
              <li>Basic technical data from your browser (see Cookies below), if you use those tools</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">Why we use it</h2>
            <p className="mt-3">We use personal information to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-white/68">
              <li>Respond to enquiries and manage bookings or orders</li>
              <li>Improve our website and guest experience</li>
              <li>Comply with law where required</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">Sharing</h2>
            <p className="mt-3">
              We do not sell your personal information. We may share it with service providers who help us run the business (e.g. email or
              hosting), only as needed for those services.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">Security &amp; retention</h2>
            <p className="mt-3">
              We take reasonable steps to protect information we hold. We keep it only as long as needed for the purposes above or as required by
              law.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">Your choices</h2>
            <p className="mt-3">
              You may ask to access or correct personal information we hold about you. Contact us and we will respond within a reasonable time.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">Cookies</h2>
            <p className="mt-3">
              If we use cookies or similar technologies, we will describe them here (e.g. essential cookies only, or analytics). Add details when
              you know what your hosting or analytics tools set.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-charcoal md:text-2xl">Updates</h2>
            <p className="mt-3">We may update this policy from time to time. The &quot;Last updated&quot; date at the top will change when we do.</p>
          </section>
        </div>
      </main>
    </>
  )
}
