import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from '@/components/site/SiteLayout'
import { AboutPage } from '@/pages/AboutPage'
import { BookPage } from '@/pages/BookPage'
import { CafePage } from '@/pages/CafePage'
import { ContactPage } from '@/pages/ContactPage'
import { HomePage } from '@/pages/HomePage'
import { StayPage } from '@/pages/StayPage'
import { StorePage } from '@/pages/StorePage'
import { TermsPage } from '@/pages/TermsPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { AdminDashboardPage } from '@/pages/AdminDashboardPage'

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/cafe" element={<CafePage />} />
        <Route path="/stay" element={<StayPage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/book" element={<BookPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Route>
    </Routes>
  )
}
