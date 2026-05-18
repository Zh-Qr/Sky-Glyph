import { useRef, useEffect } from 'react'
import type { GlyphCandidate, StarInfo } from '../types'
import { drawBackground, drawAllStars, drawSelectedStars, drawGlyphEdges } from '../utils/canvas'

interface MiniCanvasProps {
  candidate: GlyphCandidate
  allStars: StarInfo[]
  selected: boolean
  onClick: () => void
  index: number
}

function MiniCanvas({ candidate, allStars, selected, onClick, index }: MiniCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = 120
    const H = 120

    ctx.clearRect(0, 0, W, H)
    drawBackground(ctx, W, H)

    ctx.save()
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, W * 0.49, 0, Math.PI * 2)
    ctx.clip()

    const selectedIds = new Set(candidate.selected_stars.map((s) => s.id))
    drawAllStars(ctx, allStars, W, H, selectedIds)
    drawGlyphEdges(ctx, allStars, candidate.edges as [number, number][], W, H, 0.8)
    drawSelectedStars(ctx, candidate.selected_stars, W, H)

    ctx.restore()
  }, [candidate, allStars])

  return (
    <button
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden transition-all border ${
        selected
          ? 'border-star-blue/60 ring-1 ring-star-blue/30'
          : 'border-star-blue/10 hover:border-star-blue/30'
      }`}
    >
      <canvas ref={ref} width={120} height={120} className="w-full h-auto" />
      <div className="absolute bottom-0 inset-x-0 bg-cosmos-950/70 py-0.5 px-1 flex justify-between">
        <span className="text-xs font-mono text-star-blue/50">#{index + 1}</span>
        <span className="text-xs font-mono text-star-gold/70">{(candidate.score * 100).toFixed(0)}</span>
      </div>
    </button>
  )
}

interface Props {
  candidates: GlyphCandidate[]
  allStars: StarInfo[]
  selectedIndex: number
  onSelect: (i: number) => void
}

export function GlyphPreview({ candidates, allStars, selectedIndex, onSelect }: Props) {
  if (candidates.length === 0) return null

  return (
    <div className="mt-4">
      <p className="text-xs font-mono text-star-blue/50 uppercase tracking-widest mb-2">
        Candidates ({candidates.length})
      </p>
      <div className="grid grid-cols-5 gap-2">
        {candidates.map((c, i) => (
          <MiniCanvas
            key={i}
            candidate={c}
            allStars={allStars}
            selected={i === selectedIndex}
            onClick={() => onSelect(i)}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}
