import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch user profile for display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user?.id || '')
    .single()

  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'there'

  return (
    <div>
      <h1
        className="text-4xl font-bold mb-8"
        style={{
          color: 'var(--color-deep-red)',
        }}
      >
        Welcome back, {displayName}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* This Week's Reading */}
        <div
          className="p-6 rounded-lg border-2"
          style={{
            backgroundColor: 'white',
            borderColor: 'var(--color-muted-gold)',
          }}
        >
          <h2
            className="text-xl font-bold mb-4"
            style={{
              color: 'var(--color-dark-brown)',
            }}
          >
            This Week's Reading
          </h2>
          <p
            className="text-sm"
            style={{
              color: 'var(--color-warm-gray)',
            }}
          >
            Coming soon: Reading assignments and progress tracking
          </p>
        </div>

        {/* Recent Discussions */}
        <div
          className="p-6 rounded-lg border-2"
          style={{
            backgroundColor: 'white',
            borderColor: 'var(--color-muted-gold)',
          }}
        >
          <h2
            className="text-xl font-bold mb-4"
            style={{
              color: 'var(--color-dark-brown)',
            }}
          >
            Recent Discussions
          </h2>
          <p
            className="text-sm"
            style={{
              color: 'var(--color-warm-gray)',
            }}
          >
            Coming soon: Latest discussion threads and replies
          </p>
        </div>

        {/* Your Roles This Week */}
        <div
          className="p-6 rounded-lg border-2"
          style={{
            backgroundColor: 'white',
            borderColor: 'var(--color-muted-gold)',
          }}
        >
          <h2
            className="text-xl font-bold mb-4"
            style={{
              color: 'var(--color-dark-brown)',
            }}
          >
            Your Roles This Week
          </h2>
          <p
            className="text-sm"
            style={{
              color: 'var(--color-warm-gray)',
            }}
          >
            Coming soon: Facilitator roles and responsibilities
          </p>
        </div>
      </div>
    </div>
  )
}
