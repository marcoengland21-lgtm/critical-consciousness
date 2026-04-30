export interface NavItem {
  href: string
  label: string
  icon: string
  mobileTab?: boolean // true = show in bottom tab bar (max 4 + More)
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home', mobileTab: true },
  { href: '/reading',   label: 'Reading',   icon: 'book', mobileTab: true },
  { href: '/threads',   label: 'Threads',   icon: 'chat', mobileTab: true },
  { href: '/members',   label: 'Members',   icon: 'members' },
  { href: '/glossary',  label: 'Glossary',  icon: 'glossary' },
  { href: '/journal',   label: 'Journal',   icon: 'journal' },
  { href: '/schedule',  label: 'Schedule',  icon: 'calendar' },
  { href: '/resources', label: 'Resources', icon: 'link' },
  { href: '/profile',   label: 'Profile',   icon: 'user', mobileTab: true },
]
