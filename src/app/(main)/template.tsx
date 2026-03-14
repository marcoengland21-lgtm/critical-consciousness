/**
 * template.tsx — re-mounts on every route change (unlike layout.tsx which persists).
 * Wraps page content in an entry animation that fires on each navigation.
 */
export default function MainTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-page-enter">
      {children}
    </div>
  )
}
