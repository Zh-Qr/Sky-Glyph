import { useState } from 'react'
import type { CatalogInfo, FormValues } from '../types'
import { GLYPH_FONTS, PRESETS, STYLES } from '../types'

interface Props {
  values: FormValues
  onChange: (v: FormValues) => void
  onGenerate: () => void
  loading: boolean
  supportedChars: string[]
  catalogs: CatalogInfo[]
}

export function ControlPanel({ values, onChange, onGenerate, loading, supportedChars, catalogs }: Props) {
  const [showChars, setShowChars] = useState(false)

  const update = (patch: Partial<FormValues>) => onChange({ ...values, ...patch })
  const timezoneOffset = (() => {
    const match = values.datetime.match(/([+-]\d{2}:\d{2})$/)
    return match?.[1] ?? '+00:00'
  })()

  const inputCls =
    'w-full bg-cosmos-800/65 border border-star-blue/15 rounded px-3 py-2 text-star-white/90 font-mono text-sm focus:outline-none focus:border-star-blue/50 focus:bg-cosmos-700/70 transition-all placeholder-star-white/20 shadow-[inset_0_1px_12px_rgba(168,200,255,0.03)]'

  const labelCls = 'block text-xs font-mono text-star-blue/60 mb-1 tracking-widest uppercase'

  return (
    <div className="space-y-5">
      {/* Location Presets */}
      <div>
        <p className={labelCls}>Location Presets</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => update({ latitude: p.latitude, longitude: p.longitude, elevation: p.elevation })}
            className="px-2.5 py-1 text-xs font-mono border border-star-blue/15 rounded text-star-blue/70 hover:border-star-blue/50 hover:text-star-blue hover:bg-star-blue/10 transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Latitude</label>
          <input
            type="number"
            className={inputCls}
            value={values.latitude}
            step="0.0001"
            onChange={(e) => update({ latitude: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelCls}>Longitude</label>
          <input
            type="number"
            className={inputCls}
            value={values.longitude}
            step="0.0001"
            onChange={(e) => update({ longitude: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelCls}>Elevation (m)</label>
          <input
            type="number"
            className={inputCls}
            value={values.elevation}
            step="1"
            onChange={(e) => update({ elevation: parseFloat(e.target.value) })}
          />
        </div>
      </div>

      {/* Datetime */}
      <div>
        <label className={labelCls}>Observation Time</label>
        <input
          type="datetime-local"
          className={inputCls}
          value={values.datetime.slice(0, 16)}
          onChange={(e) => update({ datetime: e.target.value + ':00' + timezoneOffset })}
        />
        <p className="mt-1 text-[11px] font-mono text-star-blue/35">
          timezone preserved as UTC{timezoneOffset}
        </p>
      </div>

      {/* Text */}
      <div>
        <label className={labelCls}>
          Sky Text
          <button
            onClick={() => setShowChars(!showChars)}
            className="ml-2 text-star-blue/40 hover:text-star-blue/70 normal-case"
          >
            {showChars ? '▲ hide' : '▼ show all'}
          </button>
        </label>
        <input
          type="text"
          maxLength={10}
          className={inputCls + ' text-center text-2xl font-display tracking-[0.22em] h-12 uppercase'}
          value={values.char}
          onChange={(e) => {
            const text = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
            update({ char: text })
          }}
          placeholder="A"
        />
        <p className="mt-1 text-[11px] font-mono text-star-blue/35">
          A-Z and 0-9, up to 10 characters
        </p>
        {showChars && (
          <div className="mt-2 flex flex-wrap gap-1">
            {supportedChars.map((c) => (
              <button
                key={c}
                onClick={() => update({ char: (values.char + c).slice(0, 10) })}
                className={`w-7 h-7 text-xs font-mono rounded transition-all ${
                  values.char.endsWith(c)
                    ? 'bg-star-blue/20 text-star-blue border border-star-blue/50 shadow-[0_0_14px_rgba(168,200,255,0.22)]'
                    : 'border border-star-blue/10 text-star-white/50 hover:border-star-blue/30 hover:text-star-white/80'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Catalog */}
      <div>
        <label className={labelCls}>Star Catalog</label>
        <select
          className={inputCls}
          value={values.catalog}
          onChange={(e) => update({ catalog: e.target.value })}
        >
          {catalogs.map((catalog) => (
            <option key={catalog.key} value={catalog.key} disabled={!catalog.available}>
              {catalog.label}
              {catalog.rows ? ` · ${catalog.rows.toLocaleString()} stars` : ''}
              {!catalog.available ? ' · add CSV first' : ''}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] font-mono text-star-blue/35">
          Put larger CSVs in backend/app/data, then refresh.
        </p>
      </div>

      {/* Style */}
      <div>
        <label className={labelCls}>Style</label>
        <div className="space-y-1.5">
          {STYLES.map((s) => (
            <label
              key={s.value}
              className={`flex items-start gap-3 p-2.5 rounded border cursor-pointer transition-all ${
                values.style === s.value
                  ? 'border-star-blue/45 bg-star-blue/10 shadow-[0_0_22px_rgba(168,200,255,0.06)]'
                  : 'border-star-blue/10 hover:border-star-blue/25'
              }`}
            >
              <input
                type="radio"
                name="style"
                value={s.value}
                checked={values.style === s.value}
                onChange={() => update({ style: s.value })}
              className="mt-0.5 accent-blue-300"
              />
              <div>
                <p className="text-sm font-display text-star-white/90">{s.label}</p>
                <p className="text-xs font-mono text-star-blue/50">{s.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Font */}
      <div>
        <label className={labelCls}>Glyph Font</label>
        <div className="grid grid-cols-3 gap-1.5">
          {GLYPH_FONTS.map((font) => (
            <button
              key={font.value}
              type="button"
              title={font.desc}
              onClick={() => update({ glyphFont: font.value })}
              className={`px-2 py-2 rounded border text-center transition-all ${
                values.glyphFont === font.value
                  ? 'border-star-gold/45 bg-star-gold/10 text-star-gold shadow-[0_0_18px_rgba(255,215,122,0.08)]'
                  : 'border-star-blue/10 text-star-blue/55 hover:border-star-blue/30 hover:text-star-blue'
              }`}
            >
              <span className="block font-display text-sm leading-none">{font.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] font-mono text-star-blue/35">
          Soft Wide gives fuller, less skinny star lettering.
        </p>
      </div>

      {/* Advanced */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Max Magnitude</label>
          <input
            type="range"
            min="4"
            max="10"
            step="0.5"
            value={values.maxMagnitude}
            onChange={(e) => update({ maxMagnitude: parseFloat(e.target.value) })}
            className="w-full accent-blue-300"
          />
          <p className="text-xs font-mono text-star-blue/50 text-right">{values.maxMagnitude}</p>
        </div>
        <div>
          <label className={labelCls}>Min Altitude °</label>
          <input
            type="range"
            min="0"
            max="45"
            step="1"
            value={values.minAltitude}
            onChange={(e) => update({ minAltitude: parseFloat(e.target.value) })}
            className="w-full accent-blue-300"
          />
          <p className="text-xs font-mono text-star-blue/50 text-right">{values.minAltitude}°</p>
        </div>
      </div>

      {/* Generate */}
      <button
        onClick={onGenerate}
        disabled={loading || !values.char}
        className={`w-full py-3.5 font-display text-lg tracking-[0.15em] rounded border transition-all ${
          loading
            ? 'border-star-blue/20 text-star-blue/30 cursor-wait'
            : 'border-star-blue/35 text-star-blue hover:border-star-blue/80 hover:text-star-white hover:bg-star-blue/10 hover:shadow-[0_0_30px_rgba(168,200,255,0.15)] active:scale-[0.99]'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin text-sm">*</span>
            Reading the stars...
          </span>
        ) : (
          '*  Generate Glyph'
        )}
      </button>
    </div>
  )
}
