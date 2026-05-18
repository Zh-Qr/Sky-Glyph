import type { StarInfo, GlyphCandidate } from '../types'

export interface ViewTransform {
  cx: number
  cy: number
  zoom: number
  rotation?: number
}

interface DrawOptions {
  view?: ViewTransform
  time?: number
  focus?: boolean
  maxStars?: number
  reveal?: number
}

export function starRadius(mag: number): number {
  return Math.max(0.5, Math.min(4, 3.5 - 0.35 * mag))
}

export function starOpacity(mag: number): number {
  // Brighter stars are more opaque
  const norm = Math.max(0, Math.min(1, 1 - (mag + 2) / 11))
  return 0.3 + 0.7 * norm
}

export function starColor(mag: number): string {
  // Very bright: warm white, dim: cooler blue
  if (mag < 0) return '#fff8e7'
  if (mag < 2) return '#f0f0ff'
  if (mag < 4) return '#d0d8ff'
  return '#a8c8ff'
}

export function computeFocusView(candidate: GlyphCandidate | null): ViewTransform {
  if (!candidate || candidate.selected_stars.length === 0) {
    return { cx: 0.5, cy: 0.5, zoom: 1, rotation: 0 }
  }

  const rotation = -candidate.rotation
  const angle = (rotation * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const rawCx =
    candidate.selected_stars.reduce((sum, star) => sum + star.x, 0) /
    candidate.selected_stars.length
  const rawCy =
    candidate.selected_stars.reduce((sum, star) => sum + star.y, 0) /
    candidate.selected_stars.length

  const rotated = candidate.selected_stars.map((star) => {
    const dx = star.x - rawCx
    const dy = star.y - rawCy
    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
    }
  })

  const minX = Math.min(...rotated.map((p) => p.x))
  const maxX = Math.max(...rotated.map((p) => p.x))
  const minY = Math.min(...rotated.map((p) => p.y))
  const maxY = Math.max(...rotated.map((p) => p.y))
  const centerRotX = (minX + maxX) / 2
  const centerRotY = (minY + maxY) / 2

  // Convert the visual center of the rotated bounds back into sky coordinates.
  const cx = rawCx + centerRotX * cos + centerRotY * sin
  const cy = rawCy - centerRotX * sin + centerRotY * cos
  const width = Math.max(maxX - minX, 0.12)
  const height = Math.max(maxY - minY, 0.12)
  const zoomX = 0.68 / width
  const zoomY = 0.58 / height
  const zoom = Math.max(1, Math.min(4.2, zoomX, zoomY))
  return { cx, cy, zoom, rotation }
}

export function projectPoint(
  x: number,
  y: number,
  w: number,
  h: number,
  view: ViewTransform = { cx: 0.5, cy: 0.5, zoom: 1 }
) {
  const angle = ((view.rotation ?? 0) * Math.PI) / 180
  const dx = x - view.cx
  const dy = y - view.cy
  const rx = dx * Math.cos(angle) - dy * Math.sin(angle)
  const ry = dx * Math.sin(angle) + dy * Math.cos(angle)
  return {
    x: rx * view.zoom * w + w / 2,
    y: ry * view.zoom * h + h / 2,
  }
}

function isOnCanvas(x: number, y: number, w: number, h: number, margin = 24) {
  return x >= -margin && x <= w + margin && y >= -margin && y <= h + margin
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7)
  grad.addColorStop(0, '#11143a')
  grad.addColorStop(0.38, '#090b24')
  grad.addColorStop(0.72, '#050510')
  grad.addColorStop(1, '#020108')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  const nebulaGrad = ctx.createRadialGradient(w * 0.58, h * 0.38, 0, w * 0.58, h * 0.38, w * 0.45)
  nebulaGrad.addColorStop(0, 'rgba(255, 215, 122, 0.075)')
  nebulaGrad.addColorStop(0.35, 'rgba(124, 58, 237, 0.07)')
  nebulaGrad.addColorStop(0.7, 'rgba(8, 145, 178, 0.035)')
  nebulaGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = nebulaGrad
  ctx.fillRect(0, 0, w, h)

  const horizon = ctx.createLinearGradient(0, h * 0.1, 0, h)
  horizon.addColorStop(0, 'rgba(0,0,0,0)')
  horizon.addColorStop(0.72, 'rgba(255,215,122,0.025)')
  horizon.addColorStop(1, 'rgba(192,38,211,0.045)')
  ctx.fillStyle = horizon
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.globalAlpha = 0.24
  for (let i = 0; i < 110; i++) {
    const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * w
    const y = (Math.sin(i * 37.3 + 2.1) * 0.5 + 0.5) * h
    const a = 0.18 + (Math.sin(i * 13.1) * 0.5 + 0.5) * 0.34
    ctx.fillStyle = `rgba(210,225,255,${a})`
    ctx.fillRect(x, y, 0.7, 0.7)
  }
  ctx.restore()
}

export function drawSkyBorder(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(168, 200, 255, 0.14)'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(168, 200, 255, 0.035)'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.33, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(168, 200, 255, 0.03)'
  ctx.stroke()

  // Horizon label
  ctx.font = '10px "JetBrains Mono"'
  ctx.fillStyle = 'rgba(168,200,255,0.25)'
  ctx.fillText('N', cx - 5, cy - r - 6)
  ctx.fillText('S', cx - 4, cy + r + 14)
  ctx.fillText('E', cx + r + 6, cy + 4)
  ctx.fillText('W', cx - r - 18, cy + 4)
  ctx.restore()
}

export function drawAllStars(
  ctx: CanvasRenderingContext2D,
  stars: StarInfo[],
  w: number,
  h: number,
  selectedIds: Set<number> = new Set(),
  options: DrawOptions = {}
) {
  const view = options.view
  const time = options.time ?? 0
  const maxStars = options.maxStars ?? stars.length
  const maxScan = options.focus ? Math.min(stars.length, Math.max(maxStars * 5, 18000)) : maxStars
  let drawn = 0
  let scanned = 0

  for (const star of stars) {
    if (drawn >= maxStars || scanned >= maxScan) break
    scanned += 1
    const p = projectPoint(star.x, star.y, w, h, view)
    const px = p.x
    const py = p.y
    if (!isOnCanvas(px, py, w, h)) continue

    const zoomBoost = Math.sqrt(view?.zoom ?? 1)
    const r = Math.min(4.8, starRadius(star.mag) * (options.focus ? 0.72 : 1) * zoomBoost)
    const twinkle = 0.76 + 0.24 * Math.sin(time * 0.002 + star.id * 0.73)
    const alpha = starOpacity(star.mag) * twinkle * (options.focus ? 0.46 : 1)
    const color = starColor(star.mag)
    const isSelected = selectedIds.has(star.id)

    if (isSelected) continue // drawn separately

    ctx.save()
    ctx.globalAlpha = alpha

    // Outer glow for bright stars
    if (star.mag < 2) {
      const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 4)
      glow.addColorStop(0, `rgba(255,245,210,0.38)`)
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(px, py, r * 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = alpha * 0.45
      ctx.strokeStyle = 'rgba(255,245,210,0.55)'
      ctx.lineWidth = 0.55
      ctx.beginPath()
      ctx.moveTo(px - r * 2.2, py)
      ctx.lineTo(px + r * 2.2, py)
      ctx.moveTo(px, py - r * 2.2)
      ctx.lineTo(px, py + r * 2.2)
      ctx.stroke()
    }

    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(px, py, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
    drawn += 1
  }
}

export function drawSelectedStars(
  ctx: CanvasRenderingContext2D,
  stars: StarInfo[],
  w: number,
  h: number,
  glowColor = '#a8c8ff',
  options: DrawOptions = {}
) {
  const view = options.view
  const revealCount = Math.ceil(stars.length * (options.reveal ?? 1))
  const time = options.time ?? 0

  for (const [index, star] of stars.entries()) {
    if (index >= revealCount) break
    const p = projectPoint(star.x, star.y, w, h, view)
    const px = p.x
    const py = p.y
    const birth = Math.min(1, Math.max(0, ((options.reveal ?? 1) * stars.length - index)))
    const pulse = 0.82 + 0.18 * Math.sin(time * 0.004 + star.id)
    const r = Math.min(7, starRadius(star.mag) * Math.sqrt(view?.zoom ?? 1) * (0.85 + birth * 0.35))

    ctx.save()
    ctx.globalAlpha = birth * pulse

    // Large glow
    const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 8)
    glow.addColorStop(0, `rgba(255,230,170, 0.68)`)
    glow.addColorStop(0.28, `rgba(168,200,255, 0.22)`)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(px, py, r * 8, 0, Math.PI * 2)
    ctx.fill()

    // Medium glow
    const mg = ctx.createRadialGradient(px, py, 0, px, py, r * 3)
    mg.addColorStop(0, `rgba(255,248,225, 0.96)`)
    mg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = mg
    ctx.beginPath()
    ctx.arc(px, py, r * 3, 0, Math.PI * 2)
    ctx.fill()

    // Core
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(px, py, r + 0.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,230,170,0.7)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(px - r * 2.8, py)
    ctx.lineTo(px + r * 2.8, py)
    ctx.moveTo(px, py - r * 2.8)
    ctx.lineTo(px, py + r * 2.8)
    ctx.stroke()

    ctx.restore()
  }
}

export function drawGlyphEdges(
  ctx: CanvasRenderingContext2D,
  allStars: StarInfo[],
  edges: [number, number][],
  w: number,
  h: number,
  alpha = 0.7,
  options: DrawOptions = {}
) {
  ctx.save()
  const view = options.view
  const reveal = options.reveal ?? 1
  const visibleEdges = Math.max(0, Math.min(edges.length, reveal * edges.length))

  for (const [edgeIndex, [i, j]] of edges.entries()) {
    if (edgeIndex >= visibleEdges) break
    const a = allStars[i]
    const b = allStars[j]
    if (!a || !b) continue

    const pa = projectPoint(a.x, a.y, w, h, view)
    const pb = projectPoint(b.x, b.y, w, h, view)
    const x1 = pa.x
    const y1 = pa.y
    const edgeReveal = Math.max(0, Math.min(1, visibleEdges - edgeIndex))
    const x2 = x1 + (pb.x - x1) * edgeReveal
    const y2 = y1 + (pb.y - y1) * edgeReveal

    const lineGrad = ctx.createLinearGradient(x1, y1, x2, y2)
    lineGrad.addColorStop(0, 'rgba(255,215,122,0.7)')
    lineGrad.addColorStop(0.5, 'rgba(208,228,255,0.9)')
    lineGrad.addColorStop(1, 'rgba(168,200,255,0.7)')

    // Glow layer
    ctx.globalAlpha = alpha * 0.26 * edgeReveal
    ctx.strokeStyle = lineGrad
    ctx.lineWidth = 6
    ctx.shadowColor = '#d0e4ff'
    ctx.shadowBlur = 18
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    // Core line
    ctx.globalAlpha = alpha * 0.82 * edgeReveal
    ctx.strokeStyle = lineGrad
    ctx.lineWidth = 0.9
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  ctx.restore()
}

export function drawPosterText(
  ctx: CanvasRenderingContext2D,
  locationName: string,
  datetime: string,
  w: number,
  h: number,
  phrase?: string
) {
  ctx.save()
  ctx.font = '13px "Crimson Pro", serif'
  ctx.fillStyle = 'rgba(214,226,255,0.62)'
  ctx.textAlign = 'center'

  const dt = new Date(datetime)
  const dtStr = isNaN(dt.getTime()) ? datetime : dt.toUTCString().replace(' GMT', ' UTC')
  const text = `Written by real stars above ${locationName}  ·  ${dtStr}`
  ctx.fillText(text, w / 2, h - 18)
  if (phrase) {
    ctx.font = '18px "Cormorant Garamond", serif'
    ctx.fillStyle = 'rgba(255,238,198,0.7)'
    ctx.fillText(phrase, w / 2, h - 42)
  }
  ctx.restore()
}

function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.rect(x, y - h, w, h)
}

function drawNanjingSilhouette(ctx: CanvasRenderingContext2D, w: number, baseY: number) {
  ctx.moveTo(0, baseY)
  ctx.lineTo(0, baseY - 38)
  ctx.quadraticCurveTo(w * 0.16, baseY - 56, w * 0.28, baseY - 42)
  ctx.lineTo(w * 0.34, baseY - 42)
  ctx.lineTo(w * 0.34, baseY - 62)
  ctx.lineTo(w * 0.37, baseY - 78)
  ctx.lineTo(w * 0.40, baseY - 62)
  ctx.lineTo(w * 0.40, baseY - 42)
  ctx.lineTo(w * 0.56, baseY - 42)
  ctx.lineTo(w * 0.56, baseY - 50)
  ctx.lineTo(w * 0.75, baseY - 50)
  ctx.lineTo(w * 0.75, baseY - 42)
  ctx.quadraticCurveTo(w * 0.88, baseY - 58, w, baseY - 36)
  ctx.lineTo(w, baseY)
  ctx.closePath()
}

function drawShanghaiSilhouette(ctx: CanvasRenderingContext2D, w: number, baseY: number) {
  ctx.moveTo(0, baseY)
  drawBuilding(ctx, w * 0.04, baseY, 34, 48)
  drawBuilding(ctx, w * 0.13, baseY, 42, 70)
  ctx.moveTo(w * 0.31, baseY)
  ctx.lineTo(w * 0.34, baseY - 112)
  ctx.lineTo(w * 0.37, baseY)
  drawBuilding(ctx, w * 0.48, baseY, 50, 88)
  drawBuilding(ctx, w * 0.62, baseY, 38, 58)
  drawBuilding(ctx, w * 0.75, baseY, 48, 78)
  ctx.lineTo(w, baseY)
  ctx.closePath()
}

function drawDefaultSilhouette(ctx: CanvasRenderingContext2D, w: number, baseY: number) {
  ctx.moveTo(0, baseY)
  ctx.lineTo(0, baseY - 34)
  ctx.quadraticCurveTo(w * 0.2, baseY - 82, w * 0.42, baseY - 44)
  ctx.quadraticCurveTo(w * 0.58, baseY - 22, w * 0.72, baseY - 54)
  ctx.quadraticCurveTo(w * 0.88, baseY - 88, w, baseY - 40)
  ctx.lineTo(w, baseY)
  ctx.closePath()
}

function drawTokyoSilhouette(ctx: CanvasRenderingContext2D, w: number, baseY: number) {
  ctx.moveTo(0, baseY)
  drawBuilding(ctx, w * 0.05, baseY, 40, 52)
  drawBuilding(ctx, w * 0.16, baseY, 42, 72)
  ctx.moveTo(w * 0.46, baseY)
  ctx.lineTo(w * 0.50, baseY - 128)
  ctx.lineTo(w * 0.54, baseY)
  drawBuilding(ctx, w * 0.66, baseY, 46, 65)
  drawBuilding(ctx, w * 0.78, baseY, 54, 84)
  ctx.lineTo(w, baseY)
  ctx.closePath()
}

function drawNewYorkSilhouette(ctx: CanvasRenderingContext2D, w: number, baseY: number) {
  ctx.moveTo(0, baseY)
  const widths = [38, 30, 48, 34, 58, 32, 44, 28, 52, 36, 46, 30]
  let x = 8
  for (let i = 0; i < widths.length; i += 1) {
    const bw = widths[i]
    const bh = 42 + ((i * 37) % 78)
    drawBuilding(ctx, x, baseY, bw, bh)
    x += bw + 10
  }
  ctx.lineTo(w, baseY)
  ctx.closePath()
}

export function drawLandscape(
  ctx: CanvasRenderingContext2D,
  locationName: string,
  w: number,
  h: number
) {
  const baseY = h - 78
  ctx.save()

  ctx.beginPath()
  const lower = locationName.toLowerCase()
  if (lower.includes('nanjing')) {
    drawNanjingSilhouette(ctx, w, baseY)
  } else if (lower.includes('shanghai')) {
    drawShanghaiSilhouette(ctx, w, baseY)
  } else if (lower.includes('tokyo')) {
    drawTokyoSilhouette(ctx, w, baseY)
  } else if (lower.includes('new york')) {
    drawNewYorkSilhouette(ctx, w, baseY)
  } else {
    drawDefaultSilhouette(ctx, w, baseY)
  }

  const silhouette = ctx.createLinearGradient(0, baseY - 130, 0, h)
  silhouette.addColorStop(0, 'rgba(7,8,22,0.72)')
  silhouette.addColorStop(1, 'rgba(1,1,7,0.98)')
  ctx.fillStyle = silhouette
  ctx.shadowColor = 'rgba(168,200,255,0.06)'
  ctx.shadowBlur = 10
  ctx.fill()

  ctx.shadowBlur = 0
  const groundFade = ctx.createLinearGradient(0, baseY - 10, 0, h)
  groundFade.addColorStop(0, 'rgba(2,2,10,0)')
  groundFade.addColorStop(0.18, 'rgba(2,2,10,0.28)')
  groundFade.addColorStop(1, 'rgba(1,1,6,0.78)')
  ctx.fillStyle = groundFade
  ctx.fillRect(0, baseY - 10, w, h - baseY + 10)

  ctx.textAlign = 'left'
  ctx.font = '12px "JetBrains Mono", monospace'
  ctx.fillStyle = 'rgba(214,226,255,0.42)'
  ctx.fillText(`LOOKING UP FROM ${locationName.toUpperCase()}`, 28, h - 82)

  ctx.restore()
}
