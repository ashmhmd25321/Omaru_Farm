import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/site/ErrorBoundary'
import { SiteLayout } from '@/components/site/SiteLayout'

const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const BookPage = lazy(() => import('@/pages/BookPage').then((m) => ({ default: m.BookPage })))
const CafePage = lazy(() => import('@/pages/CafePage').then((m) => ({ default: m.CafePage })))
const ContactPage = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const StayPage = lazy(() => import('@/pages/StayPage').then((m) => ({ default: m.StayPage })))
const StorePage = lazy(() => import('@/pages/StorePage').then((m) => ({ default: m.StorePage })))
const TermsPage = lazy(() => import('@/pages/TermsPage').then((m) => ({ default: m.TermsPage })))
const CartPage = lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })))
const AccountPage = lazy(() => import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })))

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-surface px-5 text-sm text-stone">
      Loading Omaru Farm…
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route element={<SiteLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/cafe" element={<CafePage />} />
            <Route path="/stay" element={<StayPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/book" element={<BookPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
