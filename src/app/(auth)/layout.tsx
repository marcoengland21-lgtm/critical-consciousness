const quotes = [
  { text: 'The educator must be educated.', author: 'Marx' },
  { text: 'To read is to rewrite.', author: 'Freire' },
  { text: 'The point is to change it.', author: 'Marx' },
  { text: 'No one teaches another, nor is anyone self-taught.', author: 'Freire' },
  { text: 'All that is solid melts into air.', author: 'Marx' },
  { text: 'Freedom is the consciousness of necessity.', author: 'Engels' },
  { text: 'Reading the world precedes reading the word.', author: 'Freire' },
]

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const quote = quotes[new Date().getDay()]

  return (
    <main className="flex min-h-screen">
      {/* Brand Panel — left half on desktop, top section on mobile */}
      <div
        className="hidden md:flex md:w-1/2 flex-col items-center justify-center p-12"
        style={{
          backgroundColor: 'var(--bg-nav)',
        }}
      >
        <div className="max-w-sm text-center">
          <h1
            className="text-3xl lg:text-4xl font-bold mb-3"
            style={{ color: 'var(--text-inverse)' }}
          >
            Capital
            <span className="block text-xl lg:text-2xl font-normal mt-1" style={{ opacity: 0.8 }}>
              Study Group
            </span>
          </h1>
          <div className="w-12 h-0.5 mx-auto my-6" style={{ backgroundColor: 'var(--accent-purple)' }} />
          <p
            className="text-sm mb-6"
            style={{ color: 'var(--text-inverse)', opacity: 0.7 }}
          >
            Read together. Think together.
          </p>
          <p
            className="text-sm italic"
            style={{
              color: 'var(--text-inverse)',
              opacity: 0.6,
              fontFamily: "'Lora', Georgia, serif",
            }}
            suppressHydrationWarning
          >
            &ldquo;{quote.text}&rdquo; — {quote.author}
          </p>
        </div>
      </div>

      {/* Form Panel — right half on desktop, full width on mobile */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8"
        style={{ backgroundColor: 'var(--bg-page)' }}
      >
        {/* Mobile-only brand header */}
        <div className="md:hidden mb-8 text-center">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--accent-red)' }}
          >
            Capital Study Group
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Read together. Think together.
          </p>
          <p
            className="text-sm italic mt-3"
            style={{
              color: 'var(--text-secondary)',
              fontFamily: "'Lora', Georgia, serif",
            }}
            suppressHydrationWarning
          >
            &ldquo;{quote.text}&rdquo; — {quote.author}
          </p>
          <div className="w-12 h-0.5 mx-auto mt-6" style={{ backgroundColor: 'var(--accent-purple)' }} />
        </div>

        {/* Form card */}
        <div className="w-full max-w-md">
          <div
            className="p-8 rounded-xl card-elevated"
            style={{
              backgroundColor: 'var(--bg-card)',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
