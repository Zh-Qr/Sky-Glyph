export interface StarInfo {
  id: number
  name: string | null
  ra_deg: number
  dec_deg: number
  mag: number
  alt_deg: number
  az_deg: number
  x: number
  y: number
}

export interface ObserverInfo {
  latitude: number
  longitude: number
  elevation: number
  datetime: string
  catalog: string
}

export interface SkyResponse {
  observer: ObserverInfo
  stars: StarInfo[]
  total_visible: number
}

export interface GlyphCandidate {
  score: number
  score_breakdown: {
    total: number
    shape: number
    brightness: number
    natural: number
    distribution: number
    visibility: number
  }
  rotation: number
  scale: number
  translation: [number, number]
  selected_stars: StarInfo[]
  edges: [number, number][]
  template_points: [number, number][]
}

export interface GlyphResponse {
  char: string
  style: string
  observer: ObserverInfo
  all_stars: StarInfo[]
  best_candidate: GlyphCandidate
  candidates: GlyphCandidate[]
  supported_chars: string[]
}

export interface FormValues {
  latitude: number
  longitude: number
  elevation: number
  datetime: string
  char: string
  style: string
  maxMagnitude: number
  minAltitude: number
  catalog: string
  glyphFont: string
}

export interface CatalogInfo {
  key: string
  label: string
  filename: string
  available: boolean
  rows: number | null
}

export const CATALOGS: CatalogInfo[] = [
  { key: 'sample', label: 'Sample bright stars', filename: 'stars_sample.csv', available: true, rows: 200 },
  { key: 'hipparcos', label: 'Hipparcos', filename: 'hipparcos.csv', available: false, rows: null },
  { key: 'bright_star', label: 'Yale Bright Star Catalog', filename: 'bright_star.csv', available: false, rows: null },
  { key: 'tycho2', label: 'Tycho-2', filename: 'tycho2.csv', available: false, rows: null },
]

export const PRESETS = [
  { label: 'Nanjing', latitude: 32.0603, longitude: 118.7969, elevation: 20 },
  { label: 'Tokyo', latitude: 35.6762, longitude: 139.6503, elevation: 40 },
  { label: 'Beijing', latitude: 39.9042, longitude: 116.4074, elevation: 44 },
  { label: 'Shanghai', latitude: 31.2304, longitude: 121.4737, elevation: 4 },
  { label: 'New York', latitude: 40.7128, longitude: -74.0060, elevation: 10 },
  { label: 'London', latitude: 51.5074, longitude: -0.1278, elevation: 11 },
  { label: 'Sydney', latitude: -33.8688, longitude: 151.2093, elevation: 58 },
  { label: 'Paris', latitude: 48.8566, longitude: 2.3522, elevation: 35 },
]

export const STYLES = [
  { value: 'accurate-glyph', label: 'Accurate Glyph', desc: 'Shape-priority matching' },
  { value: 'bright-constellation', label: 'Bright Constellation', desc: 'Favor bright stars' },
  { value: 'romantic-poster', label: 'Romantic Poster', desc: 'Balanced artistic beauty' },
]

export const GLYPH_FONTS = [
  { value: 'soft-wide', label: 'Soft Wide', desc: 'Rounder, wider, poster-friendly' },
  { value: 'rounded', label: 'Rounded', desc: 'Gentle proportions' },
  { value: 'classic', label: 'Classic', desc: 'Original geometric skeleton' },
]
