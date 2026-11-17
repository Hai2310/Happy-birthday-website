import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

let cached: THREE.BufferGeometry | null = null

/** Procedural rose head (~0.5 units): spiral of cupped petals around a bud, merged into one geometry. */
export function roseHeadGeometry(): THREE.BufferGeometry {
  if (cached) return cached
  const parts: THREE.BufferGeometry[] = []
  const bud = new THREE.SphereGeometry(0.07, 12, 10)
  bud.scale(1, 1.4, 1)
  bud.translate(0, 0.07, 0)
  parts.push(bud)
  const layers = [
    { n: 3, r: 0.07, open: 0.15, size: 0.1, y: 0.06 },
    { n: 4, r: 0.1, open: 0.45, size: 0.13, y: 0.04 },
    { n: 5, r: 0.13, open: 0.8, size: 0.16, y: 0.02 },
    { n: 6, r: 0.16, open: 1.15, size: 0.18, y: 0.0 },
  ]
  layers.forEach((L, li) => {
    for (let i = 0; i < L.n; i++) {
      const g = new THREE.SphereGeometry(L.size, 10, 8, -Math.PI * 0.32, Math.PI * 0.64, 0, Math.PI * 0.62)
      g.scale(1, 1.15, 0.55)
      g.translate(0, 0, -L.size * 0.15)
      g.rotateX(-L.open)
      g.translate(0, L.y, L.r * 0.4)
      g.rotateY((i / L.n) * Math.PI * 2 + li * 0.6)
      parts.push(g)
    }
  })
  const merged = mergeGeometries(parts.map((p) => p.toNonIndexed()))!
  merged.computeVertexNormals()
  parts.forEach((p) => p.dispose())
  cached = merged
  return merged
}

let leafCached: THREE.BufferGeometry | null = null
export function leafGeometry() {
  if (leafCached) return leafCached
  const g = new THREE.SphereGeometry(0.08, 8, 6)
  g.scale(0.55, 0.12, 1.3)
  leafCached = g
  return g
}

/** Single interactive rose (stem + head) */
export function Rose({ color = '#c2385c', scale = 1, glow = 0, ...props }: { color?: string; scale?: number; glow?: number } & JSX.IntrinsicElements['group']) {
  return (
    <group scale={scale} {...props}>
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.9, 6]} />
        <meshStandardMaterial color="#2f5a35" roughness={0.8} />
      </mesh>
      <mesh position={[0.07, -0.5, 0]} rotation={[0, 0, -0.7]} geometry={leafGeometry()}>
        <meshStandardMaterial color="#3d7044" roughness={0.7} />
      </mesh>
      <mesh geometry={roseHeadGeometry()}>
        <meshPhysicalMaterial color={color} roughness={0.5} sheen={1} sheenColor="#ffd0dc" emissive={color} emissiveIntensity={glow} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
