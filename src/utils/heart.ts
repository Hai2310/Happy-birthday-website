import * as THREE from 'three'

/** Classic 2D heart outline as a THREE.Shape, centred, ~1 unit tall. */
export function heartShape(scale = 1) {
  const s = new THREE.Shape()
  const N = 80
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2
    const x = 16 * Math.pow(Math.sin(t), 3)
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    const px = (x / 34) * scale
    const py = (y / 34) * scale + 0.06 * scale
    if (i === 0) s.moveTo(px, py)
    else s.lineTo(px, py)
  }
  return s
}

export function heartGeometry(scale = 1, depth = 0.25) {
  const g = new THREE.ExtrudeGeometry(heartShape(scale), {
    depth: depth * scale,
    bevelEnabled: true,
    bevelThickness: 0.08 * scale,
    bevelSize: 0.06 * scale,
    bevelSegments: 4,
    curveSegments: 24,
  })
  g.center()
  return g
}

/** Points filling a true 3D heart volume (implicit surface), biased to the shell. Deterministic. */
export function heartPoints(count: number, size = 3, seed = 1): Float32Array {
  let s = seed
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const out = new Float32Array(count * 3)
  let n = 0
  let guard = 0
  while (n < count && guard++ < count * 200) {
    const x = (rand() * 2 - 1) * 1.3
    const y = (rand() * 2 - 1) * 1.3
    const z = (rand() * 2 - 1) * 1.3
    // (x² + 9/4 y² + z² − 1)³ − x² z³ − 9/80 y² z³ ≤ 0   (z is "up")
    const a = x * x + 2.25 * y * y + z * z - 1
    const f = a * a * a - x * x * z * z * z - 0.1125 * y * y * z * z * z
    if (f <= 0 && (f > -0.04 || rand() < 0.12)) {
      out[n * 3] = x * size
      out[n * 3 + 1] = z * size // heart's up axis → world Y
      out[n * 3 + 2] = y * size
      n++
    }
  }
  return out
}
