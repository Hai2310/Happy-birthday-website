import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

const vert = /* glsl */ `
  attribute float aSize; attribute float aPhase;
  uniform float uTime; uniform float uPixel; uniform float uReveal;
  varying float vAlpha; varying vec3 vColor; attribute vec3 color;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.65 + 0.35 * sin(uTime * (0.6 + aPhase) + aPhase * 12.0);
    vAlpha = tw * smoothstep(aPhase * 0.8, aPhase * 0.8 + 0.25, uReveal);
    vColor = color;
    gl_PointSize = aSize * uPixel * (60.0 / -mv.z);
  }`
const frag = /* glsl */ `
  varying float vAlpha; varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.6);
    gl_FragColor = vec4(vColor, a * vAlpha);
  }`

/** Twinkling star sphere. `reveal` 0→1 fades stars in one by one. */
export function Starfield({ count = 2500, radius = 60, reveal = 1, revealRef }: { count?: number; radius?: number; reveal?: number; revealRef?: { current: number } }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(count * 3)
    const c = new Float32Array(count * 3)
    const s = new Float32Array(count)
    const ph = new Float32Array(count)
    const warm = new THREE.Color('#ffc4dc')
    const cool = new THREE.Color('#e6d2ff')
    const tmp = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const r = radius * (0.6 + Math.random() * 0.4)
      const q = Math.sqrt(1 - u * u)
      p.set([r * q * Math.cos(th), r * u, r * q * Math.sin(th)], i * 3)
      tmp.copy(cool).lerp(warm, Math.random())
      c.set([tmp.r, tmp.g, tmp.b], i * 3)
      s[i] = Math.random() < 0.06 ? 3 + Math.random() * 2 : 0.8 + Math.random() * 1.6
      ph[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(s, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1))
    return g
  }, [count, radius])
  useEffect(() => () => geo.dispose(), [geo])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixel: { value: 1 }, uReveal: { value: reveal } }), []) // eslint-disable-line
  useFrame((st) => {
    uniforms.uTime.value = st.clock.elapsedTime
    uniforms.uPixel.value = st.gl.getPixelRatio()
    uniforms.uReveal.value = revealRef ? revealRef.current : reveal
  })
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}
