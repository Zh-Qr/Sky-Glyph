interface Props {
  canvasRef: HTMLCanvasElement | null
  char: string
  disabled: boolean
}

export function ExportPosterButton({ canvasRef, char, disabled }: Props) {
  const handleExport = () => {
    if (!canvasRef) return
    const dataUrl = canvasRef.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `sky-glyph-${char}-${Date.now()}.png`
    a.click()
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className={`w-full py-2.5 font-mono text-xs tracking-widest uppercase rounded border transition-all ${
        disabled
          ? 'border-star-blue/10 text-star-blue/20 cursor-not-allowed'
          : 'border-star-blue/20 text-star-blue/60 hover:border-star-blue/50 hover:text-star-blue hover:bg-star-blue/5'
      }`}
    >
      ↓  Export Poster PNG
    </button>
  )
}
