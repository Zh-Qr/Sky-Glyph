import type { SkyResponse, GlyphResponse, FormValues } from '../types'

const BASE = '/api'

function normalizeApiError(error: unknown): Error {
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return new Error(
      'Cannot reach the Sky Glyph backend. Start it with: cd backend && source .venv/bin/activate && python run.py'
    )
  }
  return error instanceof Error ? error : new Error('Unknown network error')
}

export async function fetchSky(form: FormValues): Promise<SkyResponse> {
  try {
    const res = await fetch(`${BASE}/sky`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: form.latitude,
        longitude: form.longitude,
        elevation: form.elevation,
        datetime: form.datetime,
        maxMagnitude: form.maxMagnitude,
        minAltitude: form.minAltitude,
        catalog: form.catalog,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail ?? 'Sky fetch failed')
    }
    return res.json()
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function fetchGlyph(form: FormValues): Promise<GlyphResponse> {
  try {
    const res = await fetch(`${BASE}/glyph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: form.latitude,
        longitude: form.longitude,
        elevation: form.elevation,
        datetime: form.datetime,
        char: form.char,
        catalog: form.catalog,
        maxMagnitude: form.maxMagnitude,
        minAltitude: form.minAltitude,
        style: form.style,
        glyphFont: form.glyphFont,
        candidateCount: 5,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail ?? 'Glyph fetch failed')
    }
    return res.json()
  } catch (error) {
    throw normalizeApiError(error)
  }
}
