import { useMemo } from 'react'

export function SiteFooter() {
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  return (
    <footer className="border-t border-gold/20 py-8 text-center text-sm text-white/60">
      © {currentYear} Omaru Farm. Crafted with a premium farm-to-table experience in mind.
    </footer>
  )
}

