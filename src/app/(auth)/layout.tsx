export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main
      className="flex items-center justify-center min-h-screen p-4"
      style={{
        backgroundColor: 'var(--color-warm-cream)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold"
            style={{
              color: 'var(--color-deep-red)',
            }}
          >
            Critical Consciousness
          </h1>
          <p
            className="text-sm mt-1"
            style={{
              color: 'var(--color-warm-gray)',
            }}
          >
            Collaborative Study Platform
          </p>
        </div>
        <div
          className="p-8 rounded-lg"
          style={{
            backgroundColor: 'var(--bg-card)',
            boxShadow: '0 2px 8px rgba(44, 24, 16, 0.1)',
          }}
        >
          {children}
        </div>
      </div>
    </main>
  )
}
