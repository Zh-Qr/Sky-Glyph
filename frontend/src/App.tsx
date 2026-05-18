import { useState, useCallback, useEffect, useRef } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { SkyCanvas } from './components/SkyCanvas'
import { StarInfoPanel } from './components/StarInfoPanel'
import { GlyphPreview } from './components/GlyphPreview'
import { ExportPosterButton } from './components/ExportPosterButton'
import type { FormValues, GlyphResponse, StarInfo, GlyphCandidate, ObserverInfo, CatalogInfo } from './types'
import { CATALOGS } from './types'
import { fetchGlyph } from './utils/api'
import { ROMANTIC_STAR_PHRASES } from './utils/phrases'

function toLocalIsoWithOffset(date: Date) {
  const pad = (n: number) => String(Math.abs(Math.trunc(n))).padStart(2, '0')
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
  const offsetMins = Math.abs(offsetMinutes) % 60
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:00${sign}${pad(offsetHours)}:${pad(offsetMins)}`
}

const NOW = new Date()
NOW.setMinutes(0, 0, 0)
const DEFAULT_DATETIME = toLocalIsoWithOffset(NOW)

const DEFAULT_FORM: FormValues = {
  latitude: 35.6762,
  longitude: 139.6503,
  elevation: 40,
  datetime: DEFAULT_DATETIME,
  char: 'A',
  style: 'romantic-poster',
  maxMagnitude: 8.5,
  minAltitude: 8,
  catalog: 'sample',
  glyphFont: 'soft-wide',
}

export default function App() {
  const [form, setForm] = useState<FormValues>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [allStars, setAllStars] = useState<StarInfo[]>([])
  const [candidates, setCandidates] = useState<GlyphCandidate[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [observer, setObserver] = useState<ObserverInfo | null>(null)
  const [totalVisible, setTotalVisible] = useState(0)
  const [supportedChars, setSupportedChars] = useState<string[]>(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
  )
  const [catalogs, setCatalogs] = useState<CatalogInfo[]>(CATALOGS)
  const [phrase, setPhrase] = useState(ROMANTIC_STAR_PHRASES[0])

  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)
  const didAutoGenerate = useRef(false)

  // Fetch supported chars on mount
  useEffect(() => {
    fetch('/api/chars')
      .then((r) => r.json())
      .then((data) => {
        if (data.supported) setSupportedChars(data.supported)
      })
      .catch(() => {})

    fetch('/api/catalogs')
      .then((r) => r.json())
      .then((data) => {
        if (data.catalogs) setCatalogs(data.catalogs)
      })
      .catch(() => {})
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!form.char) return
    setLoading(true)
    setError(null)
    try {
      const data: GlyphResponse = await fetchGlyph(form)
      setAllStars(data.all_stars)
      setCandidates(data.candidates)
      setSelectedIdx(0)
      setObserver(data.observer)
      setTotalVisible(data.all_stars.length)
      setSupportedChars(data.supported_chars)
      setPhrase(ROMANTIC_STAR_PHRASES[Math.floor(Math.random() * ROMANTIC_STAR_PHRASES.length)])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    if (didAutoGenerate.current) return
    didAutoGenerate.current = true
    handleGenerate()
  }, [handleGenerate])

  const candidate = candidates[selectedIdx] ?? null

  // Location label for poster
  const locationLabel = (() => {
    const preset = [
      { label: 'Tokyo', lat: 35.6762, lon: 139.6503 },
      { label: 'Nanjing', lat: 32.0603, lon: 118.7969 },
      { label: 'Beijing', lat: 39.9042, lon: 116.4074 },
      { label: 'Shanghai', lat: 31.2304, lon: 121.4737 },
      { label: 'New York', lat: 40.7128, lon: -74.006 },
      { label: 'London', lat: 51.5074, lon: -0.1278 },
      { label: 'Sydney', lat: -33.8688, lon: 151.2093 },
      { label: 'Paris', lat: 48.8566, lon: 2.3522 },
    ].find(
      (p) => Math.abs(p.lat - form.latitude) < 0.01 && Math.abs(p.lon - form.longitude) < 0.01
    )
    if (preset) return preset.label
    return `${form.latitude.toFixed(2)}°, ${form.longitude.toFixed(2)}°`
  })()

  return (
    <div className="min-h-screen bg-cosmos-950 text-star-white/90 overflow-x-hidden sky-shell">
      {/* Header */}
      <header className="border-b border-star-blue/10 px-8 py-5 flex items-center justify-between relative z-10">
        <div>
          <h1 className="font-display text-4xl font-light tracking-[0.12em] text-star-white/95">
            Sky Glyph
          </h1>
          <p className="font-body text-sm text-star-blue/60 italic mt-0.5">
            a letter written by the real sky above you
          </p>
        </div>
        <div className="text-right hidden md:block">
          <p className="font-mono text-xs text-star-blue/30 tracking-widest">STAR CATALOG</p>
          <p className="font-mono text-xs text-star-blue/50">Bright Star Catalog · {supportedChars.length} glyphs</p>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row min-h-[calc(100vh-88px)] relative z-10">
        {/* Left: Control Panel */}
        <aside className="w-full lg:w-80 xl:w-88 border-r border-star-blue/10 p-6 flex-shrink-0 glass-panel">
          <ControlPanel
            values={form}
            onChange={setForm}
            onGenerate={handleGenerate}
            loading={loading}
            supportedChars={supportedChars}
            catalogs={catalogs}
          />
        </aside>

        {/* Center: Sky Canvas */}
        <section className="flex-1 p-6 flex flex-col items-center justify-start gap-4">
          {/* Error */}
          {error && (
            <div className="w-full max-w-2xl bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3 font-mono text-sm text-red-300/80">
              <span className="text-red-400 mr-2">!</span>{error}
            </div>
          )}

          {/* Canvas */}
          <div className="w-full max-w-2xl">
            <SkyCanvas
              allStars={allStars}
              candidate={candidate}
              locationLabel={locationLabel}
              datetime={form.datetime}
              phrase={phrase}
              loading={loading}
              onCanvasReady={setCanvasEl}
            />
          </div>

          {/* Export */}
          <div className="w-full max-w-2xl">
            <ExportPosterButton
              canvasRef={canvasEl}
              char={form.char}
              disabled={candidates.length === 0}
            />
          </div>

          {/* Candidate Previews */}
          <div className="w-full max-w-2xl">
            <GlyphPreview
              candidates={candidates}
              allStars={allStars}
              selectedIndex={selectedIdx}
              onSelect={setSelectedIdx}
            />
          </div>
        </section>

        {/* Right: Info Panel */}
        <aside className="w-full lg:w-72 xl:w-80 border-l border-star-blue/10 p-6 flex-shrink-0 glass-panel">
          <div className="sticky top-6">
            <p className="text-xs font-mono text-star-blue/50 uppercase tracking-widest mb-4">
              Star Information
            </p>
            <StarInfoPanel
              candidate={candidate}
              observer={observer}
              totalVisible={totalVisible}
              phrase={phrase}
            />
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="border-t border-star-blue/10 px-8 py-4 flex items-center justify-between relative z-10">
        <p className="font-mono text-xs text-star-blue/25">
          Sky Glyph · Real-sky character art
        </p>
        <p className="font-mono text-xs text-star-blue/25">
          Powered by Astropy · Hipparcos-compatible
        </p>
      </footer>
    </div>
  )
}
