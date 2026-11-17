import * as THREE from 'three'

/**
 * Ref-counted texture cache: frames that share a photo share one GPU texture,
 * and the texture is disposed when the last frame using it unmounts.
 */
const cache = new Map<string, { tex: THREE.Texture; refs: number; ready: Promise<THREE.Texture> }>()
const loader = new THREE.TextureLoader()

export function acquireTexture(url: string, maxAniso = 4): { tex: THREE.Texture; ready: Promise<THREE.Texture> } {
  let e = cache.get(url)
  if (!e) {
    const tex = new THREE.Texture()
    const ready = new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(
        url,
        (t) => {
          tex.image = t.image
          tex.colorSpace = THREE.SRGBColorSpace
          tex.anisotropy = maxAniso
          tex.generateMipmaps = true
          tex.minFilter = THREE.LinearMipmapLinearFilter
          tex.needsUpdate = true
          resolve(tex)
        },
        undefined,
        reject,
      )
    })
    ready.catch(() => undefined)
    e = { tex, refs: 0, ready }
    cache.set(url, e)
  }
  e.refs++
  return { tex: e.tex, ready: e.ready }
}

export function releaseTexture(url: string) {
  const e = cache.get(url)
  if (!e) return
  e.refs--
  if (e.refs <= 0) {
    // delay so a quickly re-mounted frame (scene replay) can reuse it
    setTimeout(() => {
      const cur = cache.get(url)
      if (cur && cur.refs <= 0) {
        cur.tex.dispose()
        cache.delete(url)
      }
    }, 4000)
  }
}

/** Canvas-drawn texture for 3D text / placeholders (fonts must already be loaded). */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function placeholderTexture(label: string, sub: string, seed = 0) {
  return canvasTexture(512, 640, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h)
    const hues = [['#2a2140', '#5a2f48'], ['#1d2440', '#3c2c52'], ['#33233a', '#6b3a4f']][seed % 3]
    grd.addColorStop(0, hues[0])
    grd.addColorStop(1, hues[1])
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(216,185,135,0.55)'
    g.lineWidth = 3
    g.strokeRect(28, 28, w - 56, h - 56)
    g.fillStyle = 'rgba(216,185,135,0.9)'
    g.textAlign = 'center'
    g.font = 'italic 600 44px "Cormorant Garamond", Georgia, serif'
    wrap(g, label, w / 2, h / 2 - 20, w - 110, 50)
    g.font = '300 22px "Be Vietnam Pro", sans-serif'
    g.fillStyle = 'rgba(255,248,240,0.6)'
    g.fillText(sub, w / 2, h - 80)
  })
}

export function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (g.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  lines.push(line)
  const start = y - ((lines.length - 1) * lh) / 2
  lines.forEach((l, i) => g.fillText(l, x, start + i * lh))
}

export function glowTexture(color = '255,220,170') {
  return canvasTexture(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
    r.addColorStop(0, `rgba(${color},1)`)
    r.addColorStop(0.25, `rgba(${color},0.5)`)
    r.addColorStop(1, `rgba(${color},0)`)
    g.fillStyle = r
    g.fillRect(0, 0, w, w)
  })
}
