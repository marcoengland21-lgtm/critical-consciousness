'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MapEntry {
  id: string
  term: string
  definition: string
}

interface MapEdge {
  id: string
  from: string
  to: string
  note: string | null
}

interface SimNode {
  id: string
  term: string
  definition: string
  x: number
  y: number
  vx: number
  vy: number
}

interface ConceptMapProps {
  entries: MapEntry[]
  edges: MapEdge[]
}

// ── Tunables ─────────────────────────────────────────────────────────────────

const CANVAS_WIDTH = 900
const CANVAS_HEIGHT = 560
const NODE_RADIUS = 7
const HALO_RADIUS = 22
const ARROW_LENGTH = 9

const REPULSION = 8000      // node-node repel strength
const ATTRACTION = 0.02     // edge-spring strength
const CENTER_PULL = 0.0008  // gentle pull toward centre to keep graph onscreen
const DAMPING = 0.85        // velocity damping per frame
const TARGET_DIST = 110     // edge resting distance
const SETTLE_FRAMES = 400   // how long to run physics before pausing

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Concept Map — full force-directed view of the group's glossary edges.
 *
 * Per IMPROVEMENTS_PLAN §11.4 + §11.8:
 * - Drives from concept_edges (directed). related_terms[] is not consulted.
 * - Editorial visual treatment: dark canvas, dotted directed edges with
 *   arrow heads, glowing purple node halos, hairline corner-bracket frame,
 *   eyebrow-style labels at the corners.
 * - Selection: click a node, panel slides in from the right showing
 *   definition + outgoing/incoming edges.
 * - Empty state when fewer than 3 terms or zero edges (the empty state is
 *   itself a teaching artifact — the map starts sparse and grows with the
 *   group's reading).
 * - Mobile fallback (§11.11): list view under 768px instead of canvas.
 */
export default function ConceptMap({ entries, edges }: ConceptMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const framesRunRef = useRef(0)
  const nodesRef = useRef<SimNode[]>([])

  const [, setTick] = useState(0) // forces re-render on each frame
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Detect viewport width — only render canvas on >=768px (§11.11)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Initialise simulation nodes when entries change.
  // Random-but-deterministic-feeling positions in a centred ring.
  useEffect(() => {
    const cx = CANVAS_WIDTH / 2
    const cy = CANVAS_HEIGHT / 2
    nodesRef.current = entries.map((entry, i) => {
      const angle = (i / Math.max(entries.length, 1)) * Math.PI * 2
      const r = 140 + (i % 3) * 30
      return {
        id: entry.id,
        term: entry.term,
        definition: entry.definition,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
      }
    })
    framesRunRef.current = 0
  }, [entries])

  // Edge index — for fast adjacency lookups during rendering and selection.
  const edgesByFromId = useMemo(() => {
    const m = new Map<string, MapEdge[]>()
    for (const e of edges) {
      const arr = m.get(e.from) || []
      arr.push(e)
      m.set(e.from, arr)
    }
    return m
  }, [edges])

  const edgesByToId = useMemo(() => {
    const m = new Map<string, MapEdge[]>()
    for (const e of edges) {
      const arr = m.get(e.to) || []
      arr.push(e)
      m.set(e.to, arr)
    }
    return m
  }, [edges])

  const entryById = useMemo(() => {
    const m = new Map<string, MapEntry>()
    for (const e of entries) m.set(e.id, e)
    return m
  }, [entries])

  // ── Physics step ──────────────────────────────────────────────────────────
  const step = () => {
    const nodes = nodesRef.current
    if (nodes.length === 0) return

    // Reset accumulated forces
    for (const n of nodes) { n.vx *= DAMPING; n.vy *= DAMPING }

    // Pairwise repulsion (Coulomb-like)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distSq = dx * dx + dy * dy + 1
        const force = REPULSION / distSq
        const dist = Math.sqrt(distSq)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx -= fx
        a.vy -= fy
        b.vx += fx
        b.vy += fy
      }
    }

    // Edge spring attraction (towards TARGET_DIST)
    for (const edge of edges) {
      const a = nodes.find((n) => n.id === edge.from)
      const b = nodes.find((n) => n.id === edge.to)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const delta = dist - TARGET_DIST
      const fx = (dx / dist) * delta * ATTRACTION
      const fy = (dy / dist) * delta * ATTRACTION
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }

    // Gentle pull to centre
    const cx = CANVAS_WIDTH / 2
    const cy = CANVAS_HEIGHT / 2
    for (const n of nodes) {
      n.vx += (cx - n.x) * CENTER_PULL
      n.vy += (cy - n.y) * CENTER_PULL
    }

    // Integrate + clamp to canvas
    for (const n of nodes) {
      n.x += n.vx
      n.y += n.vy
      n.x = Math.max(HALO_RADIUS, Math.min(CANVAS_WIDTH - HALO_RADIUS, n.x))
      n.y = Math.max(HALO_RADIUS, Math.min(CANVAS_HEIGHT - HALO_RADIUS, n.y))
    }
  }

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isMobile) return // canvas off on mobile
    if (entries.length === 0) return

    let stopped = false
    const loop = () => {
      if (stopped) return
      step()
      framesRunRef.current += 1
      drawCanvas()
      setTick((t) => t + 1)
      if (framesRunRef.current < SETTLE_FRAMES) {
        animationRef.current = requestAnimationFrame(loop)
      }
    }
    animationRef.current = requestAnimationFrame(loop)
    return () => {
      stopped = true
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, edges, isMobile])

  // Re-draw on selection / hover change without restarting physics
  useEffect(() => {
    if (!isMobile) drawCanvas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, hoveredId])

  // ── Render ────────────────────────────────────────────────────────────────
  function drawCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cs = getComputedStyle(document.documentElement)
    const accentPurple = cs.getPropertyValue('--accent-purple').trim() || '#5c3d8f'
    const accentRed = cs.getPropertyValue('--accent-red').trim() || '#a31545'
    const textPrimary = cs.getPropertyValue('--text-primary').trim() || '#1c1917'

    // Clear (transparent — outer container provides background)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const nodes = nodesRef.current
    const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) : null
    const hoveredNode = hoveredId ? nodes.find((n) => n.id === hoveredId) : null

    // Edges — dotted directional lines with arrowheads.
    // When a node is selected, edges TOUCHING it get accent-red emphasis;
    // others fade.
    for (const edge of edges) {
      const a = nodes.find((n) => n.id === edge.from)
      const b = nodes.find((n) => n.id === edge.to)
      if (!a || !b) continue

      const isHighlighted =
        (selectedId && (edge.from === selectedId || edge.to === selectedId)) ||
        (hoveredId && (edge.from === hoveredId || edge.to === hoveredId))

      ctx.save()
      ctx.setLineDash([2, 4])
      ctx.lineWidth = isHighlighted ? 1.5 : 1
      ctx.strokeStyle = isHighlighted
        ? accentRed
        : selectedId
          ? hexToRgba(accentPurple, 0.18)
          : hexToRgba(accentPurple, 0.4)

      // Stop the line a little short of the target node so the arrow sits
      // outside the halo, not inside it.
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const tx = b.x - (dx / dist) * (NODE_RADIUS + 4)
      const ty = b.y - (dy / dist) * (NODE_RADIUS + 4)

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(tx, ty)
      ctx.stroke()
      ctx.restore()

      // Arrowhead — directed, per plan: edges are directional
      ctx.save()
      ctx.fillStyle = isHighlighted ? accentRed : hexToRgba(accentPurple, 0.6)
      const angle = Math.atan2(dy, dx)
      ctx.translate(tx, ty)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-ARROW_LENGTH, -ARROW_LENGTH * 0.45)
      ctx.lineTo(-ARROW_LENGTH, ARROW_LENGTH * 0.45)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    // Nodes — soft halo + circle + label
    for (const n of nodes) {
      const isSelected = n.id === selectedId
      const isHovered = n.id === hoveredId
      const isAdjacent = selectedNode && (
        edges.some((e) => (e.from === selectedNode.id && e.to === n.id) || (e.to === selectedNode.id && e.from === n.id))
      )
      const dim = selectedId !== null && !isSelected && !isAdjacent

      // Halo — radial gradient, brightens on hover/select
      const haloOpacity = isSelected ? 0.55 : isHovered ? 0.4 : isAdjacent ? 0.3 : 0.18
      const grad = ctx.createRadialGradient(n.x, n.y, NODE_RADIUS, n.x, n.y, HALO_RADIUS)
      grad.addColorStop(0, hexToRgba(accentPurple, haloOpacity))
      grad.addColorStop(1, hexToRgba(accentPurple, 0))
      ctx.save()
      if (dim) ctx.globalAlpha = 0.3
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(n.x, n.y, HALO_RADIUS, 0, Math.PI * 2)
      ctx.fill()

      // Core circle
      ctx.fillStyle = isSelected ? accentRed : accentPurple
      ctx.beginPath()
      ctx.arc(n.x, n.y, isSelected || isHovered ? NODE_RADIUS + 1 : NODE_RADIUS, 0, Math.PI * 2)
      ctx.fill()

      // Label — Lora italic per the editorial design language
      ctx.fillStyle = textPrimary
      ctx.font = `italic ${isSelected ? 14 : 13}px Lora, Georgia, serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(n.term, n.x, n.y + NODE_RADIUS + 10)
      ctx.restore()
    }
  }

  // ── Mouse handlers ────────────────────────────────────────────────────────
  function nodeAtPoint(x: number, y: number): SimNode | null {
    for (const n of nodesRef.current) {
      const dx = n.x - x
      const dy = n.y - y
      if (dx * dx + dy * dy < (NODE_RADIUS + 6) * (NODE_RADIUS + 6)) return n
    }
    return null
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    // Account for canvas being scaled by CSS — convert client coords to canvas coords
    const scaleX = e.currentTarget.width / rect.width
    const scaleY = e.currentTarget.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const hit = nodeAtPoint(x, y)
    setSelectedId(hit ? hit.id : null)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = e.currentTarget.width / rect.width
    const scaleY = e.currentTarget.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const hit = nodeAtPoint(x, y)
    setHoveredId(hit ? hit.id : null)
    e.currentTarget.style.cursor = hit ? 'pointer' : 'default'
  }

  // ── Empty state (§11.4) ───────────────────────────────────────────────────
  // The empty state is itself a teaching artifact — the map starts sparse.
  if (entries.length < 3 || edges.length === 0) {
    return <EmptyState termCount={entries.length} edgeCount={edges.length} />
  }

  // ── Mobile fallback (§11.11) ──────────────────────────────────────────────
  if (isMobile) {
    return <MobileList entries={entries} edges={edges} entryById={entryById} edgesByFromId={edgesByFromId} />
  }

  // ── Desktop canvas ────────────────────────────────────────────────────────
  const selectedEntry = selectedId ? entryById.get(selectedId) : null
  const selectedOutgoing = selectedId ? (edgesByFromId.get(selectedId) || []) : []
  const selectedIncoming = selectedId ? (edgesByToId.get(selectedId) || []) : []

  return (
    <div className="relative">
      {/* Canvas frame with hairline corner brackets per §11.8 */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card-alt)',
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          minHeight: '420px',
        }}
      >
        {/* Corner brackets */}
        <CornerBrackets />

        {/* Eyebrow labels at corners */}
        <p
          className="text-eyebrow absolute top-3 left-4 z-10 select-none"
          style={{ pointerEvents: 'none' }}
        >
          Concept Map · {entries.length} concepts · {edges.length} connections
        </p>
        <p
          className="text-eyebrow absolute bottom-3 right-4 z-10 select-none"
          style={{ pointerEvents: 'none' }}
        >
          Capital Vol I
        </p>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredId(null)}
          className="w-full h-full block"
        />
      </div>

      {/* Selection panel — slides in from right when a node is picked */}
      {selectedEntry && (
        <div
          className="fixed right-0 top-0 h-full w-full sm:w-96 z-50 overflow-y-auto animate-slide-in-right"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderLeft: '1px solid var(--border-default)',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
          }}
        >
          <div
            className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <div>
              <p className="text-eyebrow mb-1">Selected concept</p>
              <h2 className="text-display-sm" style={{ color: 'var(--text-primary)' }}>
                {selectedEntry.term}
              </h2>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="p-1.5 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Close panel"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="px-5 py-4 space-y-5">
            <div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {selectedEntry.definition}
              </p>
            </div>

            {selectedOutgoing.length > 0 && (
              <div>
                <p className="text-eyebrow mb-2">Builds on</p>
                <ul className="space-y-1.5">
                  {selectedOutgoing.map((e) => {
                    const target = entryById.get(e.to)
                    if (!target) return null
                    return (
                      <li key={e.id}>
                        <button
                          onClick={() => setSelectedId(e.to)}
                          className="text-sm hover:underline"
                          style={{ color: 'var(--accent-purple)' }}
                        >
                          → {target.term}
                        </button>
                        {e.note && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {e.note}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {selectedIncoming.length > 0 && (
              <div>
                <p className="text-eyebrow mb-2">Concepts that build on this</p>
                <ul className="space-y-1.5">
                  {selectedIncoming.map((e) => {
                    const source = entryById.get(e.from)
                    if (!source) return null
                    return (
                      <li key={e.id}>
                        <button
                          onClick={() => setSelectedId(e.from)}
                          className="text-sm hover:underline"
                          style={{ color: 'var(--accent-purple)' }}
                        >
                          ← {source.term}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <a
              href={`/glossary?term=${encodeURIComponent(selectedEntry.term.toLowerCase())}`}
              className="text-xs font-medium"
              style={{ color: 'var(--accent-red)' }}
            >
              Open in glossary →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Corner brackets — editorial framing per §11.8 ──────────────────────────

function CornerBrackets() {
  const stroke = 'var(--text-secondary)'
  const len = 16
  const off = 12
  const common = {
    fill: 'none',
    stroke,
    strokeWidth: 1,
    pointerEvents: 'none' as const,
    style: { color: stroke },
  }
  return (
    <>
      {/* TL */}
      <svg className="absolute top-0 left-0" width={len + off} height={len + off}>
        <path {...common} d={`M ${off} ${off + len} L ${off} ${off} L ${off + len} ${off}`} />
      </svg>
      {/* TR */}
      <svg className="absolute top-0 right-0" width={len + off} height={len + off}>
        <path {...common} d={`M 0 ${off} L ${len} ${off} L ${len} ${off + len}`} />
      </svg>
      {/* BL */}
      <svg className="absolute bottom-0 left-0" width={len + off} height={len + off}>
        <path {...common} d={`M ${off} 0 L ${off} ${len} L ${off + len} ${len}`} />
      </svg>
      {/* BR */}
      <svg className="absolute bottom-0 right-0" width={len + off} height={len + off}>
        <path {...common} d={`M 0 ${len} L ${len} ${len} L ${len} 0`} />
      </svg>
    </>
  )
}

// ── Mobile fallback list view ──────────────────────────────────────────────

function MobileList({
  entries,
  edges,
  entryById,
  edgesByFromId,
}: {
  entries: MapEntry[]
  edges: MapEdge[]
  entryById: Map<string, MapEntry>
  edgesByFromId: Map<string, MapEdge[]>
}) {
  // Sort by connectedness (most-connected first) so the most central concepts
  // surface at the top — same idea as §11.11.
  const connectedness = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of edges) {
      counts.set(e.from, (counts.get(e.from) || 0) + 1)
      counts.set(e.to, (counts.get(e.to) || 0) + 1)
    }
    return counts
  }, [edges])

  const sorted = [...entries].sort((a, b) => (connectedness.get(b.id) || 0) - (connectedness.get(a.id) || 0))

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
      {sorted.map((entry) => {
        const outgoing = edgesByFromId.get(entry.id) || []
        return (
          <div
            key={entry.id}
            className="px-2 py-3"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <h3
              className="mb-1"
              style={{
                color: 'var(--text-primary)',
                fontFamily: "'Lora', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: '1.125rem',
              }}
            >
              {entry.term}
            </h3>
            {outgoing.length > 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                builds on:{' '}
                {outgoing.map((e, i) => {
                  const t = entryById.get(e.to)
                  if (!t) return null
                  return (
                    <span key={e.id}>
                      <span style={{ color: 'var(--accent-purple)' }}>{t.term}</span>
                      {i < outgoing.length - 1 ? ', ' : ''}
                    </span>
                  )
                })}
              </p>
            ) : (
              <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
                no connections yet
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Empty state — §11.4 ────────────────────────────────────────────────────

function EmptyState({ termCount, edgeCount }: { termCount: number; edgeCount: number }) {
  let message = ''
  if (termCount === 0) {
    message = "The glossary is empty — once the group adds terms and connects them, the concept map will grow here."
  } else if (termCount < 3) {
    message = `Only ${termCount} ${termCount === 1 ? 'concept' : 'concepts'} so far. The map starts to take shape once there are at least 3 terms with connections between them.`
  } else if (edgeCount === 0) {
    message = "The glossary has terms but no connections yet. Visit the glossary, pick a term, and add its first 'builds on' connection — the map will appear here."
  }

  return (
    <div
      className="relative rounded-lg overflow-hidden flex items-center justify-center"
      style={{
        backgroundColor: 'var(--bg-card-alt)',
        minHeight: '420px',
      }}
    >
      <CornerBrackets />
      <div className="px-8 py-12 text-center max-w-md">
        <p className="text-eyebrow mb-3">Map not yet built</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
        <a
          href="/glossary"
          className="inline-block mt-5 text-xs font-medium"
          style={{ color: 'var(--accent-red)' }}
        >
          Open the glossary →
        </a>
      </div>
    </div>
  )
}

// ── Helper: hex → rgba ──────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  // Accept #RRGGBB or rgb()/rgba() pass-through.
  if (hex.startsWith('rgb')) return hex
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return `rgba(92, 61, 143, ${alpha})`
  const r = parseInt(cleaned.slice(0, 2), 16)
  const g = parseInt(cleaned.slice(2, 4), 16)
  const b = parseInt(cleaned.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
