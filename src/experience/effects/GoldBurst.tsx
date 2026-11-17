import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

const vert = /* glsl */ `
  attribute vec3 aDir; attribute float aSpeed; attribute float aPhase;
  uniform float uP; uniform float uTime; uniform float uPixel; uniform float uSize;
  varying float vA;
  void main(){
    float p = clamp(uP - aPhase * 0.25, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - p, 3.0);
    vec3 pos = position + aDir * aSpeed * e;
    pos.y += p * p * 1.2 + sin(uTime * 2.0 + aPhase * 20.0) * 0.05 * p;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    vA = smoothstep(0.0, 0.08, p) * (1.0 - smoothstep(0.55, 1.0, p));
    gl_PointSize = uSize * uPixel * (20.0 / -mv.z) * (0.6 + aPhase);
  }`
const frag = /* glsl */ `
  uniform vec3 uColor; varying float vA;
  void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor * 2.0, a * a * vA); }`

/** GPU particle burst. Drive `progress.current` 0→1 (e.g. with GSAP). */
export function GoldBurst({ count = 500, progress, color = '#ffd9a0', origin = [0, 0, 0] as [number, number, number], spread = 3, size = 5, upward = 0.6 }: { count?: number; progress: { current: number }; color?: string; origin?: [number, number, number]; spread?: number; size?: number; upward?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const dir = new Float32Array(count * 3)
    const sp = new Float32Array(count)
    const ph = new Float32Array(count)
    const v = new THREE.Vector3()
    for (let i = 0; i < count; i++) {
      pos.set(origin, i * 3)
      v.set(Math.random() * 2 - 1, Math.random() * 2 - 1 + upward, Math.random() * 2 - 1).normalize()
      dir.set([v.x, v.y, v.z], i * 3)
      sp[i] = spread * (0.3 + Math.random() * 0.7)
      ph[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3))
    g.setAttribute('aSpeed', new THREE.BufferAttribute(sp, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1))
    return g
  }, [count, origin, spread, upward])
  useEffect(() => () => geo.dispose(), [geo])
  const uniforms = useMemo(() => ({ uP: { value: 0 }, uTime: { value: 0 }, uPixel: { value: 1 }, uSize: { value: size }, uColor: { value: new THREE.Color(color) } }), [color, size])
  useFrame((s) => {
    uniforms.uP.value = progress.current
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uPixel.value = s.gl.getPixelRatio()
  })
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}
