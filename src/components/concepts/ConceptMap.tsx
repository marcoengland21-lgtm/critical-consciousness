'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { GlossaryEntry } from '@/types/database'

interface Node {
  id: string
  label: string
  definition: string
  week: number | null
  x: number
  y: number
  vx: number
  vy: number
}

interface Link {
  source: string
  target: string
}

interface Props {
  entries: GlossaryEntry[]
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const ITERATIONS = 50
const DAMPING = 0.85
const REPULSION = 200
const ATTRACTION = 50
const NODE_RADIUS = 8

export default function ConceptMap({ entries }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [links, setLinks] = useState<Link[]>([])

  // Initialize nodes and links from glossary entries
  useEffect(() => {
    const newNodes: Node[] = entries.map((entry) => ({
      id: entry.id,
      label: entry.term,
      definition: entry.definition,
      week: entry.first_appearance_week,
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      vx: 0,
      vy: 0,
    }))

    const newLinks: Link[] = []
    entries.forEach((entry) => {
      if (entry.related_terms && Array.isArray(entry.related_terms)) {
        entry.related_terms.forEach((relatedTerm: string) => {
          const targetEntry = entries.find((e) => e.term.toLowerCase() === relatedTerm.toLowerCase())
          if (targetEntry) {
            newLinks.push({
              source: entry.id,
              target: targetEntry.id,
            })
          }
        })
      }
    })

    setNodes(newNodes)
    setLinks(newLinks)
  }, [entries])

  // Simple force-directed layout algorithm
  const simulateLayout = (nodesInput: Node[]): Node[] => {
    const nodesCopy = nodesInput.map((n) => ({ ...n }))

    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      // Reset forces
      nodesCopy.forEach((node) => {
        node.vx = 0
        node.vy = 0
      })

      // Apply repulsion forces between all nodes
      for (let i = 0; i < nodesCopy.length; i++) {
        for (let j = i + 1; j < nodesCopy.length; j++) {
          const n1 = nodesCopy[i]
          const n2 = nodesCopy[j]

          const dx = n2.x - n1.x
          const dy = n2.y - n1.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1

          const force = REPULSION / (distance * distance)
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force

          n1.vx -= fx
          n1.vy -= fy
          n2.vx += fx
          n2.vy += fy
        }
      }

      // Apply attraction forces for linked nodes
      links.forEach((link) => {
        const n1 = nodesCopy.find((n) => n.id === link.source)
        const n2 = nodesCopy.find((n) => n.id === link.target)

        if (n1 && n2) {
          const dx = n2.x - n1.x
          const dy = n2.y - n1.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1

          const force = (ATTRACTION * distance) / 100
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force

          n1.vx += fx
          n1.vy += fy
          n2.vx -= fx
          n2.vy -= fy
        }
      })

      // Update positions
      nodesCopy.forEach((node) => {
        node.vx *= DAMPING
        node.vy *= DAMPING
        node.x += node.vx
        node.y += node.vy

        // Boundary conditions
        if (node.x < NODE_RADIUS) node.x = NODE_RADIUS
        if (node.x > CANVAS_WIDTH - NODE_RADIUS) node.x = CANVAS_WIDTH - NODE_RADIUS
        if (node.y < NODE_RADIUS) node.y = NODE_RADIUS
        if (node.y > CANVAS_HEIGHT - NODE_RADIUS) node.y = CANVAS_HEIGHT - NODE_RADIUS
      })
    }

    return nodesCopy
  }

  // Run simulation once on mount and when entries change
  useEffect(() => {
    if (nodes.length > 0) {
      const simulated = simulateLayout(nodes)
      setNodes(simulated)
    }
  }, [entries.length])

  // Draw on canvas
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = 'var(--color-warm-cream)' === 'var(--color-warm-cream)' ? '#F5F0E8' : '#F5F0E8'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw links
    ctx.strokeStyle = 'rgba(196, 163, 90, 0.2)'
    ctx.lineWidth = 1
    links.forEach((link) => {
      const sourceNode = nodes.find((n) => n.id === link.source)
      const targetNode = nodes.find((n) => n.id === link.target)

      if (sourceNode && targetNode) {
        ctx.beginPath()
        ctx.moveTo(sourceNode.x, sourceNode.y)
        ctx.lineTo(targetNode.x, targetNode.y)
        ctx.stroke()
      }
    })

    // Draw nodes
    nodes.forEach((node) => {
      const isSelected = selectedNode?.id === node.id
      const isHovered = hoveredNode?.id === node.id

      // Determine color based on week or hover state
      let color = '#C4A35A'
      if (isSelected) {
        color = '#8B2635'
      } else if (isHovered) {
        color = '#2C1810'
      } else if (node.week) {
        const hue = ((node.week - 1) * 30) % 360
        const rgb = hslToRgb(hue, 60, 50)
        color = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
      }

      const radius = isSelected || isHovered ? NODE_RADIUS + 2 : NODE_RADIUS

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.fill()

      // Draw border for selected node
      if (isSelected) {
        ctx.strokeStyle = '#C4A35A'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })
  }, [nodes, links, selectedNode, hoveredNode])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if click is on a node
    for (const node of nodes) {
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2)
      if (distance < NODE_RADIUS + 5) {
        setSelectedNode(node)
        return
      }
    }

    setSelectedNode(null)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if mouse is over a node
    for (const node of nodes) {
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2)
      if (distance < NODE_RADIUS + 5) {
        setHoveredNode(node)
        canvasRef.current.style.cursor = 'pointer'
        return
      }
    }

    setHoveredNode(null)
    canvasRef.current.style.cursor = 'default'
  }

  // Get related nodes for the selected node
  const relatedNodes = useMemo(() => {
    if (!selectedNode) return []

    const relatedIds = new Set<string>()
    links.forEach((link) => {
      if (link.source === selectedNode.id) relatedIds.add(link.target)
      if (link.target === selectedNode.id) relatedIds.add(link.source)
    })

    return nodes.filter((n) => relatedIds.has(n.id))
  }, [selectedNode, links, nodes])

  return (
    <div className="space-y-6">
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e5e1d8' }}>
        <div className="bg-white p-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredNode(null)}
            className="w-full border rounded"
            style={{ borderColor: '#e5e1d8', cursor: hoveredNode ? 'pointer' : 'default' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Legend */}
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e5e1d8' }}>
          <div className="px-5 py-3" style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e1d8' }}>
            <h2 className="font-bold" style={{ color: 'var(--color-dark-brown)' }}>
              Legend
            </h2>
          </div>
          <div className="p-5 space-y-3" style={{ backgroundColor: 'white' }}>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#C4A35A' }} />
              <span className="text-xs" style={{ color: 'var(--color-dark-brown)' }}>
                Core concept
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#8B2635' }} />
              <span className="text-xs" style={{ color: 'var(--color-dark-brown)' }}>
                Selected
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-warm-gray)' }}>
              Colors may vary by first appearance week. Lines connect related concepts.
            </p>
          </div>
        </div>

        {/* Selected Node Details */}
        {selectedNode && (
          <div className="lg:col-span-2 rounded-lg border overflow-hidden" style={{ borderColor: '#e5e1d8' }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e1d8' }}>
              <h2 className="font-bold" style={{ color: 'var(--color-dark-brown)' }}>
                {selectedNode.label}
              </h2>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-lg leading-none"
                style={{ color: 'var(--color-warm-gray)' }}
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-4" style={{ backgroundColor: 'white' }}>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted-gold)' }}>
                  Definition
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-dark-brown)' }}>
                  {selectedNode.definition}
                </p>
              </div>

              {selectedNode.week && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted-gold)' }}>
                    First Appearance
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-dark-brown)' }}>
                    Week {selectedNode.week}
                  </p>
                </div>
              )}

              {relatedNodes.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted-gold)' }}>
                    Related Concepts ({relatedNodes.length})
                  </h3>
                  <div className="space-y-1">
                    {relatedNodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className="block w-full text-left text-sm px-2 py-1 rounded transition-colors hover:bg-gray-100"
                        style={{ color: 'var(--color-deep-red)' }}
                      >
                        {node.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Convert HSL to RGB for color variation
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const a = (s * Math.min(l, 100 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * (color / 100))
  }

  return { r: f(0), g: f(8), b: f(4) }
}
