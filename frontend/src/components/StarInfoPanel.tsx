import type { GlyphCandidate, ObserverInfo } from '../types'

interface Props {
  candidate: GlyphCandidate | null
  observer: ObserverInfo | null
  totalVisible: number
  phrase: string
}

export function StarInfoPanel({ candidate, observer, totalVisible, phrase }: Props) {
  if (!candidate || !observer) {
    return (
      <div className="text-center py-8 text-star-blue/25 font-mono text-sm">
        <p>No glyph generated yet.</p>
      </div>
    )
  }

  const dt = new Date(observer.datetime)
  const dtDisplay = isNaN(dt.getTime()) ? observer.datetime : dt.toUTCString()

  const breakdown = candidate.score_breakdown

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="border border-star-gold/15 bg-star-gold/5 rounded-lg px-4 py-3 shadow-[0_0_28px_rgba(255,215,122,0.05)]">
        <p className="text-xs font-mono text-star-gold/45 uppercase tracking-widest mb-2">
          Night Note
        </p>
        <p className="font-body text-base italic leading-relaxed text-star-gold/80">
          {phrase}
        </p>
      </div>

      {/* Observer */}
      <div className="border-b border-star-blue/10 pb-4">
        <p className="text-xs font-mono text-star-blue/50 uppercase tracking-widest mb-2">Observer</p>
        <p className="text-sm font-mono text-star-white/70">
          {observer.latitude.toFixed(4)}°N · {observer.longitude.toFixed(4)}°E · {observer.elevation}m
        </p>
        <p className="text-xs font-mono text-star-blue/50 mt-1">{dtDisplay}</p>
        <p className="text-xs font-mono text-star-blue/40 mt-1">
          {totalVisible} stars visible · catalog: {observer.catalog}
        </p>
      </div>

      {/* Score */}
      <div className="border-b border-star-blue/10 pb-4">
        <p className="text-xs font-mono text-star-blue/50 uppercase tracking-widest mb-2">Fit Score</p>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl font-display text-star-gold">{(breakdown.total * 100).toFixed(1)}</span>
          <span className="text-xs font-mono text-star-blue/40">/ 100</span>
        </div>
        <div className="space-y-1.5">
          {(['shape', 'brightness', 'natural', 'distribution', 'visibility'] as const).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs font-mono text-star-blue/50 w-20">{key}</span>
              <div className="flex-1 h-1 bg-cosmos-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-star-blue/60 rounded-full transition-all duration-700"
                  style={{ width: `${(breakdown[key] ?? 0) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-star-blue/40 w-10 text-right">
                {((breakdown[key] ?? 0) * 100).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs font-mono text-star-blue/30 mt-2">
          rotation {candidate.rotation}° · scale {(candidate.scale * 100).toFixed(0)}%
        </p>
      </div>

      {/* Selected Stars */}
      <div>
        <p className="text-xs font-mono text-star-blue/50 uppercase tracking-widest mb-2">
          Selected Stars ({candidate.selected_stars.length})
        </p>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scroll">
          {[...candidate.selected_stars]
            .sort((a, b) => a.mag - b.mag)
            .map((star) => (
              <div
                key={star.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded bg-cosmos-800/40 border border-star-blue/5"
              >
                <span
                  className="flex-shrink-0 rounded-full bg-star-white"
                  style={{
                    width: Math.max(3, 5 - star.mag * 0.4) + 'px',
                    height: Math.max(3, 5 - star.mag * 0.4) + 'px',
                    opacity: Math.max(0.4, 1 - star.mag / 9),
                  }}
                />
                <span className="text-sm font-display text-star-white/80 flex-1 truncate">
                  {star.name ?? `Star #${star.id}`}
                </span>
                <span className="text-xs font-mono text-star-gold/70">{star.mag.toFixed(2)}</span>
                <span className="text-xs font-mono text-star-blue/40">{star.alt_deg.toFixed(0)}°</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
