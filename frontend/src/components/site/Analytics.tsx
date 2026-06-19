import { useEffect } from 'react'

const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN

export function Analytics() {
  useEffect(() => {
    if (!plausibleDomain || typeof document === 'undefined') return
    if (document.querySelector('script[data-domain][src="https://plausible.io/js/script.js"]')) return

    const script = document.createElement('script')
    script.defer = true
    script.dataset.domain = plausibleDomain
    script.src = 'https://plausible.io/js/script.js'
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return null
}
