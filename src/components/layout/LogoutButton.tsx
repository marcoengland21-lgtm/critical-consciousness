'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/')
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 rounded-lg font-medium transition-colors text-sm"
      style={{
        color: 'var(--color-warm-cream)',
      }}
    >
      Logout
    </button>
  )
}
