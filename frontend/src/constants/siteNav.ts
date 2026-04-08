export type NavItem = {
  to: string
  label: string
  end?: boolean
}

export const mainNavItems: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/cafe', label: 'Cafe' },
  { to: '/stay', label: 'Stay' },
  { to: '/store', label: 'Store' },
  { to: '/contact', label: 'Contact' },
]
