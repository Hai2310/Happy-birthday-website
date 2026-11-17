import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

/** Falling rose petals — one InstancedMesh, one draw call. */
export function PetalParticles({ count = 120, area = [14, 10, 10] as [number, number, number], center = [0, 3, 0] as [number, number, number], speed = 1, colors = ['#f4c9d4', '#d991a9', '#fbe3ea'] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => {
    // curved petal: a small sphere slice, flattened
    const g = new THREE.SphereGeometry(0.09, 8, 6, 0, Math.PI * 0.9, 0, Math.PI * 0.55)
    g.scale(1, 1.25, 0.35)
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide, emissive: '#3a1020', emissiveIntensity: 0.3 }), [])
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        p: new THREE.Vector3(center[0] + (Math.random() - 0.5) * area[0], center[1] + (Math.random() - 0.5) * area[1], center[2] + (Math.random() - 0.5) * area[2]),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        v: 0.25 + Math.random() * 0.35,
        w: Math.random() * 2 + 0.5,
        ph: Math.random() * 10,
      })),
    [count, area, center],
  )
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) m.setColorAt(i, c.set(colors[i % colors.length]))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [count, colors])
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame((s, dt) => {
    const m = ref.current
    if (!m) return
    const t = s.clock.elapsedTime
    const d = Math.min(dt, 0.05) * speed
    const bottom = center[1] - area[1] / 2
    for (let i = 0; i < data.length; i++) {
      const it = data[i]
      it.p.y -= it.v * d
      it.p.x += Math.sin(t * 0.7 + it.ph) * 0.004 * speed
      it.p.z += Math.cos(t * 0.5 + it.ph) * 0.003 * speed
      if (it.p.y < bottom) it.p.y = center[1] + area[1] / 2
      it.r.x += d * it.w
      it.r.y += d * it.w * 0.7
      o.position.copy(it.p)
      o.rotation.copy(it.r)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}
