import { useRef, useEffect, useState, useCallback } from 'react'
import type { StarInfo, GlyphCandidate } from '../types'
import {
  drawBackground,
  drawSkyBorder,
  drawAllStars,
  drawSelectedStars,
  drawGlyphEdges,
  drawPosterText,
  drawLandscape,
  computeFocusView,
  projectPoint,
  type ViewTransform,
} from '../utils/canvas'

interface Tooltip {
  x: number
  y: number
  star: StarInfo
}

interface Props {
  allStars: StarInfo[]
  candidate: GlyphCandidate | null
  locationLabel: string
  datetime: string
  phrase: string
  loading: boolean
  onCanvasReady: (ref: HTMLCanvasElement | null) => void
}

const CANVAS_SIZE = 680

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function interpolateView(a: ViewTransform, b: ViewTransform, t: number): ViewTransform {
  return {
    cx: a.cx + (b.cx - a.cx) * t,
    cy: a.cy + (b.cy - a.cy) * t,
    zoom: a.zoom + (b.zoom - a.zoom) * t,
    rotation: (a.rotation ?? 0) + ((b.rotation ?? 0) - (a.rotation ?? 0)) * t,
  }
}

export function SkyCanvas({ allStars, candidate, locationLabel, datetime, phrase, loading, onCanvasReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const animationStartRef = useRef<number>(performance.now())
  const currentViewRef = useRef<ViewTransform>({ cx: 0.5, cy: 0.5, zoom: 1, rotation: 0 })

  useEffect(() => {
    animationStartRef.current = performance.now()
  }, [candidate])

  const selectedIds = new Set(candidate?.selected_stars.map((s) => s.id) ?? [])

  const draw = useCallback((now: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = CANVAS_SIZE
    const H = CANVAS_SIZE

    ctx.clearRect(0, 0, W, H)

    drawBackground(ctx, W, H)

    const elapsed = now - animationStartRef.current
    const reveal = candidate ? Math.min(1, elapsed / 5200) : 0
    const focusEase = candidate ? easeOutCubic(Math.min(1, elapsed / 2600)) : 0
    const focusView = computeFocusView(candidate)
    const view = interpolateView({ cx: 0.5, cy: 0.5, zoom: 1, rotation: 0 }, focusView, focusEase)
    currentViewRef.current = view

    if (!candidate) {
      drawSkyBorder(ctx, W / 2, H / 2, W * 0.49)
    }

    ctx.save()
    ctx.beginPath()
    if (candidate) {
      ctx.rect(20, 20, W - 40, H - 144)
    } else {
      ctx.arc(W / 2, H / 2, W * 0.49, 0, Math.PI * 2)
    }
    ctx.clip()

    drawAllStars(ctx, allStars, W, H, selectedIds, {
      view,
      time: now,
      focus: Boolean(candidate),
      maxStars: candidate ? 2600 : 1400,
    })

    if (candidate) {
      drawGlyphEdges(ctx, allStars, candidate.edges as [number, number][], W, H, 0.82, {
        view,
        reveal,
      })
    }

    if (candidate) {
      drawSelectedStars(ctx, candidate.selected_stars, W, H, '#a8c8ff', {
        view,
        time: now,
        reveal,
      })
    }

    ctx.restore()

    if (candidate) {
      drawLandscape(ctx, locationLabel, W, H)
      drawPosterText(ctx, locationLabel, datetime, W, H, phrase)
    }
  }, [allStars, candidate, locationLabel, datetime, phrase, selectedIds])

  useEffect(() => {
    let raf = 0
    const tick = (now: number) => {
      draw(now)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [draw])

  useEffect(() => {
    onCanvasReady(canvasRef.current)
  }, [onCanvasReady])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || allStars.length === 0) {
        setTooltip(null)
        return
      }
      const rect = canvasRef.current.getBoundingClientRect()
      const scaleX = CANVAS_SIZE / rect.width
      const scaleY = CANVAS_SIZE / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top) * scaleY

      let nearest: StarInfo | null = null
      let minDist = 14

      const hoverStars = candidate ? candidate.selected_stars : allStars.slice(0, 2500)
      for (const star of hoverStars) {
        const p = projectPoint(star.x, star.y, CANVAS_SIZE, CANVAS_SIZE, currentViewRef.current)
        const sx = p.x
        const sy = p.y
        const d = Math.sqrt((sx - mx) ** 2 + (sy - my) ** 2)
        if (d < minDist) {
          minDist = d
          nearest = star
        }
      }

      if (nearest) {
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          star: nearest,
        })
      } else {
        setTooltip(null)
      }
    },
    [allStars, candidate]
  )

  const handleMouseLeave = () => setTooltip(null)

  return (
    <div className="relative">
      <div className="relative rounded-2xl p-[1px] bg-[linear-gradient(135deg,rgba(255,215,122,0.18),rgba(168,200,255,0.18),rgba(192,38,211,0.08))] shadow-[0_24px_90px_rgba(0,0,0,0.45),0_0_70px_rgba(168,200,255,0.08)]">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-auto rounded-2xl block bg-cosmos-950"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 bg-cosmos-900/95 border border-star-blue/20 rounded px-3 py-2 text-xs font-mono text-star-blue/90 backdrop-blur-sm"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="text-star-white/90 font-display text-sm">{tooltip.star.name ?? `HIP ${tooltip.star.id}`}</p>
          <p>mag <span className="text-star-gold">{tooltip.star.mag.toFixed(2)}</span></p>
          <p>alt <span className="text-star-blue">{tooltip.star.alt_deg.toFixed(1)}°</span>  az <span className="text-star-blue">{tooltip.star.az_deg.toFixed(1)}°</span></p>
        </div>
      )}

      {/* Empty state */}
      {allStars.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-star-blue/45 font-display text-2xl italic">
            {loading ? 'Reading the visible sky' : 'The sky is being prepared'}
          </p>
          <p className="text-star-blue/25 font-mono text-xs mt-2">
            {loading ? 'catalog, coordinates, then a constellation will bloom' : 'start backend, then generate a real-star glyph'}
          </p>
        </div>
      )}
    </div>
  )
}
