import { useMemo, useRef, useState } from 'react'
import {
  Maximize2,
  Minus,
  Plus,
  Search,
  ArrowUpRight,
  Network,
} from 'lucide-react'
import { graphOf, titleOf } from '../core/notes'
import { usePrefs, useWorkspace } from '../state/workspace'
export function Graph({ mini = false }: { mini?: boolean }) {
  const notes = useWorkspace((s) => s.notes)
  const active = usePrefs((s) => s.active)
  const edges = useMemo(() => graphOf(notes), [notes])
  const [filter, setFilter] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({})
  const drag = useRef<{
    id: string
    x: number
    y: number
    moved: boolean
  } | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const visible = mini
    ? notes.filter(
        (n) =>
          n.path === active ||
          edges.some(
            (e) =>
              (e.source === active && e.target === n.path) ||
              (e.target === active && e.source === n.path),
          ),
      )
    : notes.filter(
        (n) =>
          n.path.toLowerCase().includes(filter.toLowerCase()) ||
          n.content.toLowerCase().includes(filter.toLowerCase()),
      )
  const points = useMemo(
    () =>
      Object.fromEntries(
        visible.map((n, i) => {
          const angle =
            (i / Math.max(visible.length, 1)) * Math.PI * 2 - Math.PI / 2
          const radius = mini ? 57 : 145 + (i % 3) * 30
          return [
            n.path,
            positions[n.path] ||
              (mini && n.path === active
                ? { x: 120, y: 85 }
                : {
                    x:
                      (mini ? 120 : 400) +
                      Math.cos(angle) * radius * (mini ? 1.4 : 1.45),
                    y: (mini ? 85 : 270) + Math.sin(angle) * radius,
                  }),
          ]
        }),
      ),
    [visible.map((n) => n.path).join('|'), mini, active, positions],
  )
  const localEdges = edges.filter((e) => points[e.source] && points[e.target])
  const w = useWorkspace.getState()
  const reset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setPositions({})
  }
  return (
    <div className={mini ? 'mini-graph' : 'graph-view'}>
      {!mini && (
        <>
          <div className="graph-heading">
            <div className="graph-kicker">
              <Network size={15} />
              YOUR KNOWLEDGE, CONNECTED
            </div>
            <h1>See the bigger picture.</h1>
            <p>
              Every idea has a neighbor. Follow a connection and see where it
              takes you.
            </p>
          </div>
          <div className="graph-search">
            <Search size={16} />
            <input
              aria-label="Filter graph"
              placeholder="Find a thought in your graph…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <span>
              {visible.length} notes · {localEdges.length} connections
            </span>
          </div>
        </>
      )}
      <svg
        ref={svg}
        className="graph-canvas"
        viewBox={mini ? '0 0 240 170' : '0 0 800 540'}
        aria-label={mini ? 'Local connections graph' : 'Knowledge graph'}
        onWheel={(e) => {
          if (!mini)
            setZoom((z) => Math.max(0.4, Math.min(2.5, z - e.deltaY * 0.001)))
        }}
        onPointerDown={(e) => {
          if (mini) return
          svg.current?.setPointerCapture(e.pointerId)
          drag.current = { id: '', x: e.clientX, y: e.clientY, moved: false }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d || mini) return
          const rect = svg.current!.getBoundingClientRect()
          const scale = 800 / rect.width / zoom
          const dx = (e.clientX - d.x) * scale
          const dy = (e.clientY - d.y) * scale
          if (Math.abs(dx) + Math.abs(dy) > 1) d.moved = true
          if (d.id) {
            const point = positions[d.id] || points[d.id]
            setPositions((p) => ({
              ...p,
              [d.id]: { x: point.x + dx, y: point.y + dy },
            }))
          } else setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
          d.x = e.clientX
          d.y = e.clientY
        }}
        onPointerUp={() => {
          const d = drag.current
          if (d?.id && !d.moved) w.open(d.id)
          drag.current = null
        }}
      >
        <defs>
          <pattern
            id={mini ? 'mini-grid' : 'graph-grid'}
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".7" fill="currentColor" opacity=".15" />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#${mini ? 'mini-grid' : 'graph-grid'})`}
        />
        <g
          transform={
            mini
              ? undefined
              : `translate(400 270) scale(${zoom}) translate(${-400 + pan.x} ${-270 + pan.y})`
          }
        >
          {localEdges.map((e) => (
            <line
              className="graph-edge"
              key={`${e.source}-${e.target}`}
              x1={points[e.source].x}
              y1={points[e.source].y}
              x2={points[e.target].x}
              y2={points[e.target].y}
            />
          ))}
          {visible.map((n) => (
            <g
              role="button"
              tabIndex={0}
              aria-label={`Open ${titleOf(n.path)}`}
              key={n.path}
              className={`graph-node ${n.path === active ? 'is-active' : ''}`}
              transform={`translate(${points[n.path].x},${points[n.path].y})`}
              onClick={() => {
                if (mini) w.open(n.path)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') w.open(n.path)
              }}
              onPointerDown={(e) => {
                if (mini) return
                e.stopPropagation()
                svg.current?.setPointerCapture(e.pointerId)
                drag.current = {
                  id: n.path,
                  x: e.clientX,
                  y: e.clientY,
                  moved: false,
                }
              }}
            >
              <circle className="node-halo" r={mini ? 11 : 22} />
              <circle r={mini ? 4 : 8} />
              {!mini && (
                <text y="30" textAnchor="middle">
                  {titleOf(n.path).slice(0, 30)}
                </text>
              )}
              <title>{titleOf(n.path)}</title>
            </g>
          ))}
        </g>
        {!visible.length && (
          <text x="400" y="270" textAnchor="middle" fill="currentColor">
            No matching notes. Try another search.
          </text>
        )}
      </svg>
      {mini ? (
        <button
          className="expand-graph"
          onClick={() => w.set({ view: 'graph' })}
        >
          Explore graph
          <ArrowUpRight size={12} />
        </button>
      ) : (
        <div className="graph-bottom">
          <span>
            <i />
            Notes
            <span className="edge-sample" />
            Connections
          </span>
          <p>Drag to explore · Scroll to zoom · Click a note to open</p>
          <div>
            <button
              className="icon-button"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
            >
              <Minus size={17} />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              className="icon-button"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
            >
              <Plus size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Reset graph"
              onClick={reset}
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
