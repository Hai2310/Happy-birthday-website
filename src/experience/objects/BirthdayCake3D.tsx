import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { canvasTexture, glowTexture } from '../../utils/textures'
import { Rose } from './Rose'

export const WEDGE = 0.72 // radians of the slice that can be cut (centred toward the camera, +z)
const TIERS = [
  { r: 1.3, h: 0.8, y: 0.55, color: '#fbf3e9' },
  { r: 0.92, h: 0.62, y: 1.35, color: '#f6d3dc' },
]
export const CAKE_TOP = TIERS[1].y + TIERS[1].h
export const CANDLE_RING = 0.7

export function candleAngles(n: number) {
  // spread over the part of the ring that is not the cuttable wedge
  const a0 = WEDGE / 2 + 0.18
  const a1 = Math.PI * 2 - WEDGE / 2 - 0.18
  return Array.from({ length: n }, (_, i) => a0 + ((a1 - a0) * (i + 0.5)) / n)
}

function spongeTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const layers = ['#f3e3cf', '#e07a98', '#f3e3cf', '#fff4ea', '#f3e3cf', '#e07a98', '#f3e3cf']
    const lh = h / layers.length
    layers.forEach((c, i) => {
      g.fillStyle = c
      g.fillRect(0, i * lh, w, lh + 1)
    })
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(160,110,70,${Math.random() * 0.12})`
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2)
    }
  })
}

/** one tier, split into body and wedge, with cut faces so the inside shows when sliced */
function Tier({ r, h, y, color, part, sponge }: { r: number; h: number; y: number; color: string; part: 'body' | 'wedge'; sponge: THREE.Texture }) {
  const start = part === 'body' ? WEDGE / 2 : -WEDGE / 2
  const len = part === 'body' ? Math.PI * 2 - WEDGE : WEDGE
  const frost = useMemo(() => new THREE.MeshPhysicalMaterial({ color, roughness: 0.62, sheen: 0.7, sheenColor: '#ffffff', clearcoat: 0.15 }), [color])
  const inside = useMemo(() => new THREE.MeshStandardMaterial({ map: sponge, roughness: 0.9, side: THREE.DoubleSide }), [sponge])
  useEffect(() => () => { frost.dispose(); inside.dispose() }, [frost, inside])
  const faces = [start, start + len].map((theta) => {
    // a vertical rectangle from centre to rim at angle theta
    return { theta, pos: [Math.sin(theta) * (r / 2), y + h / 2, Math.cos(theta) * (r / 2)] as [number, number, number] }
  })
  const piping = useMemo(() => {
    const n = Math.round((len * r) / 0.085)
    const out: [number, number, number][] = []
    for (let i = 0; i < n; i++) {
      const a = start + (len * (i + 0.5)) / n
      out.push([Math.sin(a) * (r + 0.01), y + 0.03, Math.cos(a) * (r + 0.01)])
      out.push([Math.sin(a) * (r - 0.03), y + h + 0.005, Math.cos(a) * (r - 0.03)])
    }
    return out
  }, [start, len, r, y, h])
  const pipeRef = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const m = pipeRef.current
    if (!m) return
    const o = new THREE.Object3D()
    piping.forEach((p, i) => {
      o.position.set(...p)
      o.scale.set(1, 0.8, 1)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [piping])
  return (
    <group>
      <mesh position={[0, y + h / 2, 0]} material={frost} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 72, 1, false, start, len]} />
      </mesh>
      {faces.map((f, i) => (
        <mesh key={i} position={f.pos} rotation={[0, f.theta + Math.PI / 2, 0]} material={inside}>
          <planeGeometry args={[r, h]} />
        </mesh>
      ))}
      <instancedMesh ref={pipeRef} args={[undefined, undefined, piping.length]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshPhysicalMaterial color="#fffaf3" roughness={0.5} sheen={0.6} />
      </instancedMesh>
    </group>
  )
}

const flameVert = /* glsl */ `
  varying vec2 vUv; uniform float uTime; uniform float uSeed;
  void main(){
    vUv = uv;
    vec3 p = position;
    p.x += sin(uTime * 9.0 + uSeed * 7.0 + p.y * 6.0) * 0.012 * uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`
const flameFrag = /* glsl */ `
  varying vec2 vUv; uniform float uTime; uniform float uSeed; uniform float uAlpha;
  void main(){
    vec2 c = vUv - vec2(0.5, 0.28);
    c.x *= 2.2 + vUv.y * 1.8;
    float d = length(vec2(c.x, c.y * (c.y > 0.0 ? 0.55 : 1.4)));
    float f = smoothstep(0.42, 0.0, d);
    float flick = 0.85 + 0.15 * sin(uTime * 17.0 + uSeed * 3.0);
    vec3 col = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.92, 0.7), smoothstep(0.1, 0.7, f));
    col = mix(col, vec3(0.45, 0.6, 1.0), smoothstep(0.25, 0.0, vUv.y) * 0.5);
    gl_FragColor = vec4(col * 2.2, f * flick * uAlpha);
  }`

function Candle({ angle, lit, i, onBlow }: { angle: number; lit: boolean; i: number; onBlow: (i: number) => void }) {
  const flame = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Sprite>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSeed: { value: i * 1.37 }, uAlpha: { value: 1 } }), [i])
  const haloTex = useMemo(() => glowTexture('255,190,110'), [])
  useEffect(() => () => haloTex.dispose(), [haloTex])
  const x = Math.sin(angle) * CANDLE_RING
  const z = Math.cos(angle) * CANDLE_RING
  const stripe = i % 2 ? '#fff8f0' : '#f4c9d4'
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    if (flame.current) flame.current.quaternion.copy(s.camera.quaternion)
    if (halo.current) (halo.current.material as THREE.SpriteMaterial).opacity = uniforms.uAlpha.value * (0.55 + Math.sin(s.clock.elapsedTime * 13 + i) * 0.08)
  })
  useEffect(() => {
    gsap.to(uniforms.uAlpha, { value: lit ? 1 : 0, duration: lit ? 0.4 : 0.55, ease: 'power2.out' })
    if (flame.current) gsap.to(flame.current.scale, { x: lit ? 1 : 0.2, y: lit ? 1 : 0.05, z: 1, duration: 0.5 })
  }, [lit, uniforms])
  return (
    <group position={[x, CAKE_TOP, z]}>
      <mesh position={[0, 0.17, 0]} onClick={(e) => { e.stopPropagation(); onBlow(i) }} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.34, 10]} />
        <meshStandardMaterial color={stripe} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.355, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.03, 4]} />
        <meshStandardMaterial color="#2a2220" />
      </mesh>
      <group ref={flame} position={[0, 0.42, 0]}>
        <mesh>
          <planeGeometry args={[0.09, 0.17, 1, 6]} />
          <shaderMaterial vertexShader={flameVert} fragmentShader={flameFrag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
      <sprite ref={halo} position={[0, 0.41, 0]} scale={[0.4, 0.4, 1]}>
        <spriteMaterial map={haloTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {/* finger-sized invisible hit target */}
      <mesh position={[0, 0.3, 0]} visible={false} onClick={(e) => { e.stopPropagation(); onBlow(i) }}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 6]} />
      </mesh>
    </group>
  )
}

const smokeVert = /* glsl */ `
  attribute float aCandle; attribute vec3 aRand; uniform float uOut[24]; uniform float uTime; uniform float uPixel;
  varying float vA;
  void main(){
    int ci = int(aCandle);
    float t0 = uOut[ci];
    float age = t0 > 0.0 ? uTime - t0 - aRand.z * 0.6 : -1.0;
    float life = clamp(age / 3.0, 0.0, 1.0);
    vec3 p = position;
    p.y += life * 1.3;
    p.x += sin(life * 6.0 + aRand.x * 6.28) * 0.08 * life + aRand.x * 0.12 * life;
    p.z += cos(life * 5.0 + aRand.y * 6.28) * 0.08 * life;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vA = age > 0.0 ? (1.0 - life) * smoothstep(0.0, 0.08, life) * 0.45 : 0.0;
    gl_PointSize = (6.0 + life * 30.0) * uPixel * (4.0 / -mv.z);
  }`
const smokeFrag = /* glsl */ `
  varying float vA;
  void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d); gl_FragColor = vec4(vec3(0.82,0.8,0.82), a*a*vA); }`

function Smoke({ angles, outTimes }: { angles: number[]; outTimes: { current: number[] } }) {
  const per = 14
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = angles.length * per
    const p = new Float32Array(n * 3)
    const c = new Float32Array(n)
    const r = new Float32Array(n * 3)
    angles.forEach((a, ci) => {
      for (let k = 0; k < per; k++) {
        const i = ci * per + k
        p.set([Math.sin(a) * CANDLE_RING, CAKE_TOP + 0.4, Math.cos(a) * CANDLE_RING], i * 3)
        c[i] = ci
        r.set([Math.random() - 0.5, Math.random() - 0.5, Math.random()], i * 3)
      }
    })
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('aCandle', new THREE.BufferAttribute(c, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(r, 3))
    return g
  }, [angles])
  useEffect(() => () => geo.dispose(), [geo])
  const uniforms = useMemo(() => ({ uOut: { value: new Array(24).fill(0) }, uTime: { value: 0 }, uPixel: { value: 1 } }), [])
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uPixel.value = s.gl.getPixelRatio()
    for (let i = 0; i < 24; i++) uniforms.uOut.value[i] = outTimes.current[i] ?? 0
  })
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial vertexShader={smokeVert} fragmentShader={smokeFrag} uniforms={uniforms} transparent depthWrite={false} />
    </points>
  )
}

function Topper({ text }: { text: string }) {
  const tex = useMemo(
    () =>
      canvasTexture(512, 320, (g, w, h) => {
        const grd = g.createLinearGradient(0, 0, 0, h)
        grd.addColorStop(0, '#fff1c9')
        grd.addColorStop(0.5, '#d8b987')
        grd.addColorStop(1, '#a8803f')
        g.fillStyle = grd
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.font = '600 250px "Cormorant Garamond", Georgia, serif'
        g.shadowColor = 'rgba(0,0,0,0.25)'
        g.shadowBlur = 8
        g.fillText(text, w / 2, h / 2 + 10)
      }),
    [text],
  )
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <group position={[0, CAKE_TOP + 0.42, -0.05]}>
      <mesh>
        <planeGeometry args={[0.9, 0.56]} />
        <meshStandardMaterial map={tex} transparent alphaTest={0.1} metalness={0.6} roughness={0.3} emissive="#d8b987" emissiveMap={tex} emissiveIntensity={0.35} side={THREE.DoubleSide} />
      </mesh>
      {[-0.18, 0.18].map((x) => (
        <mesh key={x} position={[x, -0.32, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.18, 4]} />
          <meshStandardMaterial color="#d8b987" metalness={1} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

export function BirthdayCake3D({ lit, onBlow, cut, topper }: { lit: boolean[]; onBlow: (i: number) => void; cut: boolean; topper?: string }) {
  const sponge = useMemo(spongeTexture, [])
  useEffect(() => () => sponge.dispose(), [sponge])
  const angles = useMemo(() => candleAngles(lit.length), [lit.length])
  const wedge = useRef<THREE.Group>(null)
  const plate = useRef<THREE.Group>(null)
  const outTimes = useRef<number[]>([])
  const clock = useRef(0)
  const light = useRef<THREE.PointLight>(null)
  const litCount = lit.filter(Boolean).length
  useFrame((s) => {
    clock.current = s.clock.elapsedTime
    if (light.current) light.current.intensity = THREE.MathUtils.lerp(light.current.intensity, (litCount / Math.max(1, lit.length)) * 7 + Math.sin(s.clock.elapsedTime * 11) * 0.2 * (litCount ? 1 : 0), 0.08)
  })
  useEffect(() => {
    lit.forEach((l, i) => {
      if (!l && !outTimes.current[i]) outTimes.current[i] = clock.current
      if (l) outTimes.current[i] = 0
    })
  }, [lit])
  useEffect(() => {
    if (!wedge.current || !plate.current) return
    if (cut) {
      const tl = gsap.timeline()
      tl.to(plate.current.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(2)' })
        .to(wedge.current.position, { y: 0.35, duration: 0.7, ease: 'power2.out' }, 0.2)
        .to(wedge.current.position, { z: 2.1, x: 0.5, duration: 1.2, ease: 'power2.inOut' })
        .to(wedge.current.position, { y: -0.05, duration: 0.5, ease: 'power2.in' })
      return () => { tl.kill() }
    }
    wedge.current.position.set(0, 0, 0)
    plate.current.scale.setScalar(0.001)
  }, [cut])
  return (
    <group>
      {/* stand */}
      <mesh position={[0, 0.5, 0]} receiveShadow>
        <cylinderGeometry args={[1.62, 1.55, 0.07, 64]} />
        <meshStandardMaterial color="#d8b987" metalness={1} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.18, 0.5, 0.5, 32]} />
        <meshStandardMaterial color="#d8b987" metalness={1} roughness={0.25} />
      </mesh>
      {/* gold ribbon band */}
      <mesh position={[0, TIERS[0].y + 0.12, 0]}>
        <cylinderGeometry args={[TIERS[0].r + 0.012, TIERS[0].r + 0.012, 0.06, 72, 1, true, WEDGE / 2, Math.PI * 2 - WEDGE]} />
        <meshStandardMaterial color="#d8b987" metalness={0.9} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      {TIERS.map((t, i) => (
        <Tier key={i} {...t} part="body" sponge={sponge} />
      ))}
      <group ref={wedge}>
        {TIERS.map((t, i) => (
          <Tier key={i} {...t} part="wedge" sponge={sponge} />
        ))}
      </group>
      <group ref={plate} position={[0.5, 0.0, 2.1]} scale={0.001}>
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.85, 0.75, 0.04, 48]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.15} clearcoat={1} />
        </mesh>
      </group>
      {/* roses on the top tier */}
      {[[0.32, -0.28, '#c2385c'], [-0.3, -0.3, '#d991a9'], [0.0, -0.45, '#a82b4c'], [0.42, 0.05, '#f4c9d4'], [-0.42, 0.02, '#e7a7b9']].map(([x, z, c], i) => (
        <Rose key={i} position={[x as number, CAKE_TOP + 0.07, z as number]} color={c as string} scale={0.55} rotation={[0, i * 1.3, 0]} />
      ))}
      {topper && <Topper text={topper} />}
      {angles.map((a, i) => (
        <Candle key={i} i={i} angle={a} lit={lit[i]} onBlow={onBlow} />
      ))}
      <Smoke angles={angles} outTimes={outTimes} />
      <pointLight ref={light} position={[0, CAKE_TOP + 0.6, 0]} intensity={7} distance={6} decay={1.5} color="#ffb870" />
    </group>
  )
}
