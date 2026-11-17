import { useFrame } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { birthdayConfig } from '../../../config/birthdayConfig'
import { ui, useT } from '../../../i18n/strings'
import { useExperience, useTier } from '../../../stores/experience'
import { TIERS } from '../../../utils/quality'
import { canvasTexture, glowTexture } from '../../../utils/textures'
import { forScene, heroIndex, photos } from '../../../data/photos'
import { audio } from '../../../components/audio/audioDirector'
import { cameraSet, cameraTo, rig, track } from '../../camera/CinematicCamera'
import { shotFor } from '../../camera/cameraPaths'
import { PhotoFrame3D } from '../../objects/PhotoFrame3D'
import { Rose } from '../../objects/Rose'
import { isPortrait } from '../../../hooks/useViewport'
import { celebrate } from '../../effects/celebrate'

const BACK = -4.9
const level = { current: 0 } // 0 = dark, 1 = lit

function Balloon({ position, color, phase }: { position: [number, number, number]; color: string; phase: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    ref.current.position.y = position[1] + Math.sin(t * 0.7 + phase) * 0.08
    ref.current.rotation.z = Math.sin(t * 0.5 + phase) * 0.06
  })
  return (
    <group ref={ref} position={position}>
      <mesh scale={[1, 1.18, 1]} castShadow>
        <sphereGeometry args={[0.32, 32, 24]} />
        <meshPhysicalMaterial color={color} roughness={0.25} clearcoat={1} clearcoatRoughness={0.15} sheen={0.4} />
      </mesh>
      <mesh position={[0, -0.39, 0]}>
        <coneGeometry args={[0.04, 0.06, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -1.15, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 1.5, 4]} />
        <meshStandardMaterial color="#e8dcc8" />
      </mesh>
    </group>
  )
}

function Gift({ position, size, color, ribbon, rot = 0 }: { position: [number, number, number]; size: [number, number, number]; color: string; ribbon: string; rot?: number }) {
  const [w, h, d] = size
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshPhysicalMaterial color={color} roughness={0.45} clearcoat={0.4} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w * 0.16, h + 0.01, d + 0.01]} />
        <meshStandardMaterial color={ribbon} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w + 0.01, h + 0.01, d * 0.16]} />
        <meshStandardMaterial color={ribbon} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, h + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[w * 0.12, w * 0.04, 8, 20]} />
        <meshStandardMaterial color={ribbon} metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  )
}

function Banner({ text }: { text: string }) {
  const letters = text.split('')
  const n = letters.length
  const span = Math.min(7.2, n * 0.48)
  const textures = useMemo(
    () =>
      letters.map((ch, i) =>
        canvasTexture(128, 160, (g, w, h) => {
          g.fillStyle = ['#692d46', '#d991a9', '#f4c9d4'][i % 3]
          g.beginPath()
          g.moveTo(0, 0)
          g.lineTo(w, 0)
          g.lineTo(w / 2, h)
          g.closePath()
          g.fill()
          g.strokeStyle = '#d8b987'
          g.lineWidth = 4
          g.stroke()
          g.fillStyle = i % 3 === 2 ? '#692d46' : '#fff8f0'
          g.font = '600 64px "Cormorant Garamond", Georgia, serif'
          g.textAlign = 'center'
          g.textBaseline = 'middle'
          g.fillText(ch, w / 2, h * 0.34)
        }),
      ),
    [text], // eslint-disable-line react-hooks/exhaustive-deps
  )
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures])
  return (
    <group position={[0, 3.55, BACK + 0.12]}>
      {letters.map((ch, i) => {
        const x = -span / 2 + (i + 0.5) * (span / n)
        const sag = -0.35 * (1 - Math.pow((2 * x) / span, 2))
        if (ch === ' ') return null
        return (
          <mesh key={i} position={[x, sag - 0.2, 0]} rotation={[0, 0, Math.sin(i) * 0.04]}>
            <planeGeometry args={[0.4, 0.5]} />
            <meshStandardMaterial map={textures[i]} transparent side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Fairy-light garland: instanced bulbs whose glow follows the room light level */
function Garland({ count = 40, y = 3.1, width = 9, sag = 0.45, z = BACK + 0.1 }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffdca8', emissive: '#ffc77a', emissiveIntensity: 0, toneMapped: false }), [])
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1)
      const x = -width / 2 + u * width
      o.position.set(x, y - sag * (1 - Math.pow(2 * u - 1, 2)), z)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [count, y, width, sag, z])
  useEffect(() => () => mat.dispose(), [mat])
  useFrame((s) => {
    mat.emissiveIntensity = level.current * (2.2 + Math.sin(s.clock.elapsedTime * 3) * 0.25)
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} material={mat}>
      <sphereGeometry args={[0.035, 8, 6]} />
    </instancedMesh>
  )
}

function Chandelier() {
  const bulbs = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff0d6', emissive: '#ffcf8a', emissiveIntensity: 0, toneMapped: false }), [])
  const light = useRef<THREE.PointLight>(null)
  useEffect(() => () => bulbs.dispose(), [bulbs])
  useFrame(() => {
    bulbs.emissiveIntensity = 0.15 + level.current * 3
    if (light.current) light.current.intensity = level.current * 22
  })
  return (
    <group position={[0, 3.7, -1]}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.8, 4]} />
        <meshStandardMaterial color="#b8935a" metalness={1} roughness={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.025, 10, 48]} />
        <meshStandardMaterial color="#d8b987" metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.35, 0.02, 10, 40]} />
        <meshStandardMaterial color="#d8b987" metalness={1} roughness={0.25} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2
        return (
          <group key={i}>
            <mesh position={[Math.cos(a) * 0.6, 0.08, Math.sin(a) * 0.6]} material={bulbs}>
              <sphereGeometry args={[0.05, 10, 8]} />
            </mesh>
            <mesh position={[Math.cos(a) * 0.6, -0.18, Math.sin(a) * 0.6]}>
              <octahedronGeometry args={[0.045, 0]} />
              <meshPhysicalMaterial color="#ffffff" roughness={0} transmission={0.6} thickness={0.2} />
            </mesh>
          </group>
        )
      })}
      <pointLight ref={light} intensity={0} distance={12} decay={1.6} color="#ffd29a" />
    </group>
  )
}

function LightSwitch({ onToggle }: { onToggle: () => void }) {
  const ring = useRef<THREE.Mesh>(null)
  const lit = useExperience((s) => s.lightsOn)
  const tex = useMemo(() => glowTexture('255,210,150'), [])
  useEffect(() => () => tex.dispose(), [tex])
  useFrame((s) => {
    if (ring.current) {
      const k = lit ? 0.4 : 1 + Math.sin(s.clock.elapsedTime * 2.4) * 0.25
      ring.current.scale.setScalar(k)
    }
  })
  return (
    <group position={[2.6, 1.45, BACK + 0.06]}>
      <sprite ref={ring as never} scale={[1.1, 1.1, 1]}>
        <spriteMaterial map={tex} transparent opacity={lit ? 0.15 : 0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <boxGeometry args={[0.32, 0.46, 0.04]} />
        <meshStandardMaterial color="#f6ecdc" emissive="#ffd9a0" emissiveIntensity={lit ? 0.05 : 0.6} />
      </mesh>
      <mesh position={[0, lit ? 0.06 : -0.06, 0.04]} rotation={[lit ? -0.4 : 0.4, 0, 0]}>
        <boxGeometry args={[0.08, 0.14, 0.05]} />
        <meshStandardMaterial color="#d8b987" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Window() {
  const moonTex = useMemo(() => glowTexture('200,214,255'), [])
  useEffect(() => () => moonTex.dispose(), [moonTex])
  return (
    <group position={[-3.2, 2.1, BACK + 0.02]}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[2, 2.4]} />
        <meshBasicMaterial color="#0d1630" />
      </mesh>
      <mesh position={[0.35, 0.5, 0]}>
        <circleGeometry args={[0.22, 32]} />
        <meshBasicMaterial color="#eef2ff" toneMapped={false} />
      </mesh>
      <sprite position={[0.35, 0.5, 0.01]} scale={[1.4, 1.4, 1]}>
        <spriteMaterial map={moonTex} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {/* frame + mullions */}
      {[[0, 1.22, 2.1, 0.08], [0, -1.22, 2.1, 0.08], [-1.02, 0, 0.08, 2.5], [1.02, 0, 0.08, 2.5], [0, 0, 0.05, 2.4], [0, 0.2, 2, 0.05]].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.02]}>
          <boxGeometry args={[w, h, 0.06]} />
          <meshStandardMaterial color="#efe4d2" roughness={0.6} />
        </mesh>
      ))}
      {/* curtains */}
      {[-1.35, 1.35].map((x) => (
        <mesh key={x} position={[x, -0.1, 0.12]}>
          <boxGeometry args={[0.55, 2.9, 0.06]} />
          <meshStandardMaterial color="#c98c9f" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

export function BirthdayRoomScene() {
  const tier = useTier()
  const settings = TIERS[tier]
  const lightsOn = useExperience((s) => s.lightsOn)
  const amb = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const spot = useRef<THREE.SpotLight>(null)
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3b2a3a', roughness: 0.92 }), [])
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a3226', roughness: 0.55, metalness: 0.05 }), [])
  useEffect(() => () => { wall.dispose(); floor.dispose() }, [wall, floor])

  const frames = useMemo(() => {
    const hero = heroIndex()
    const rest = forScene('room', 4, 1, ['couple', 'romantic', 'birthday']).filter((i) => i !== hero)
    if (!photos.length) return [-1, -2, -3, -4, -5]
    return [hero, ...rest].slice(0, Math.min(5, photos.length))
  }, [])
  const slots: { p: [number, number, number]; s: number }[] = [
    { p: [0, 2.05, BACK + 0.05], s: 1.55 },
    { p: [1.55, 1.95, BACK + 0.05], s: 0.95 },
    { p: [-1.55, 1.95, BACK + 0.05], s: 0.95 },
    { p: [3.9, 2.1, BACK + 0.05], s: 0.9 },
    { p: [-4.7, 1.6, BACK + 0.05], s: 0.7 },
  ]

  useEffect(() => {
    level.current = 0
    const portrait = isPortrait()
    cameraSet(shotFor('room', 'start', portrait))
    rig.parallax = 0.2
    track(cameraTo(shotFor('room', 'main', portrait), 3.5, 'power2.out'))
  }, [])

  useFrame(() => {
    const l = level.current
    if (amb.current) amb.current.intensity = 0.04 + l * 0.35
    if (hemi.current) hemi.current.intensity = 0.05 + l * 0.5
    if (spot.current) spot.current.intensity = l * 40
  })

  useEffect(() => {
    if (!lightsOn) return
    const tl = gsap.timeline()
    tl.to(level, { current: 0.35, duration: 0.25, ease: 'power1.out' })
      .to(level, { current: 0.15, duration: 0.15 })
      .to(level, { current: 1, duration: 2.2, ease: 'power2.inOut' })
    const portrait = isPortrait()
    tl.add(cameraTo({ pos: [0, 1.85, portrait ? 4.6 : 3.3], target: [0, 1.85, -3], fov: 50 }, 4, 'power2.inOut'), 0.6)
    tl.call(() => celebrate('soft'), [], 1.6)
    track(tl)
    return () => { tl.kill() }
  }, [lightsOn])

  const toggle = () => {
    if (useExperience.getState().lightsOn) return
    audio.unlock()
    audio.chime('sparkle')
    useExperience.getState().set({ lightsOn: true })
  }

  return (
    <>
      <color attach="background" args={['#06070d']} />
      <fog attach="fog" args={['#0b0a12', 6, 22]} />
      <ambientLight ref={amb} intensity={0.04} color="#ffe6cc" />
      <hemisphereLight ref={hemi} args={['#ffe2c4', '#2a1a22', 0.05]} />
      <directionalLight position={[-4, 4, -2]} intensity={0.5} color="#9db3ff" />
      <spotLight ref={spot} position={[0, 4.3, -0.6]} angle={0.7} penumbra={0.8} intensity={0} distance={14} decay={1.5} color="#ffd8a8" castShadow={settings.shadows} shadow-mapSize={[1024, 1024]} />

      {/* shell */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow>
        <planeGeometry args={[12, 14]} />
      </mesh>
      <mesh position={[0, 2.25, BACK]} material={wall} receiveShadow>
        <planeGeometry args={[12, 4.5]} />
      </mesh>
      <mesh position={[-6, 2.25, 2]} rotation={[0, Math.PI / 2, 0]} material={wall}>
        <planeGeometry args={[14, 4.5]} />
      </mesh>
      <mesh position={[6, 2.25, 2]} rotation={[0, -Math.PI / 2, 0]} material={wall}>
        <planeGeometry args={[14, 4.5]} />
      </mesh>
      <mesh position={[0, 4.5, 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 14]} />
        <meshStandardMaterial color="#2a1f2b" roughness={1} />
      </mesh>
      {/* wainscot rail */}
      <mesh position={[0, 1.0, BACK + 0.02]}>
        <boxGeometry args={[12, 0.05, 0.04]} />
        <meshStandardMaterial color="#d8b987" metalness={0.7} roughness={0.35} />
      </mesh>

      <Window />
      <Chandelier />
      <Garland count={tier === 'low' ? 24 : 44} />
      <Banner text="HAPPY BIRTHDAY" />
      <LightSwitch onToggle={toggle} />

      {frames.map((idx, i) => (
        <PhotoFrame3D key={i} index={idx} size={slots[i].s} position={slots[i].p} style={i === 0 ? 'glow' : 'gold'} quality={i === 0 ? 'src' : 'thumb'} onSelect={idx >= 0 ? (k) => useExperience.getState().set({ lightbox: { index: k } }) : undefined} />
      ))}

      {/* table with cloth + roses */}
      <group position={[0, 0, -2.4]}>
        <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.05, 1.05, 0.05, 48]} />
          <meshStandardMaterial color="#fbf5ec" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.42, 0]} receiveShadow>
          <cylinderGeometry args={[1.08, 1.25, 0.72, 48, 1, true]} />
          <meshStandardMaterial color="#f4c9d4" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.98, 0]}>
          <cylinderGeometry args={[0.12, 0.08, 0.36, 24]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.05} transmission={0.85} thickness={0.3} />
        </mesh>
        {[[0, 1.5, 0, '#c2385c'], [0.12, 1.42, 0.05, '#d991a9'], [-0.12, 1.4, -0.04, '#f4c9d4'], [0.03, 1.36, -0.13, '#a82b4c'], [-0.05, 1.45, 0.12, '#e7a7b9']].map(([x, y, z, c], i) => (
          <Rose key={i} position={[x as number, y as number, z as number]} color={c as string} scale={0.7} rotation={[(i - 2) * 0.12, i, (i - 2) * 0.1]} />
        ))}
      </group>

      <Gift position={[-1.6, 0, -2.6]} size={[0.6, 0.5, 0.6]} color="#f4c9d4" ribbon="#d8b987" rot={0.4} />
      <Gift position={[-2.1, 0, -1.9]} size={[0.4, 0.35, 0.4]} color="#692d46" ribbon="#d8b987" rot={-0.3} />
      <Gift position={[1.7, 0, -2.5]} size={[0.55, 0.65, 0.55]} color="#fff8f0" ribbon="#d991a9" rot={-0.5} />
      <Gift position={[2.2, 0, -1.8]} size={[0.38, 0.3, 0.38]} color="#d8b987" ribbon="#692d46" rot={0.2} />

      {[
        [-4.4, 2.6, -3.6, '#f4c9d4'], [-4.0, 2.9, -3.9, '#d8b987'], [-4.8, 2.8, -3.2, '#d991a9'], [-4.2, 2.3, -3.0, '#fff8f0'],
        [4.4, 2.7, -3.6, '#d991a9'], [4.0, 2.4, -3.2, '#f4c9d4'], [4.8, 2.9, -3.8, '#fff8f0'], [4.3, 3.1, -4.1, '#d8b987'],
        [-0.9, 4.05, -3.8, '#f4c9d4'], [0.8, 4.0, -3.9, '#d991a9'],
      ].map(([x, y, z, c], i) => (
        <Balloon key={i} position={[x as number, y as number, z as number]} color={c as string} phase={i * 1.3} />
      ))}
    </>
  )
}

export function BirthdayRoomOverlay() {
  const t = useT()
  const lightsOn = useExperience((s) => s.lightsOn)
  const [showTitle, setShowTitle] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const name = birthdayConfig.girlfriendName
  useEffect(() => {
    if (!lightsOn) return setShowTitle(false)
    const id = setTimeout(() => setShowTitle(true), 1800)
    return () => clearTimeout(id)
  }, [lightsOn])
  useGSAP(
    () => {
      if (showTitle) {
        const tl = gsap.timeline()
        tl.from('.room-hb', { opacity: 0, y: 20, filter: 'blur(8px)', duration: 1.8, ease: 'power3.out' })
          .from('.room-sub', { opacity: 0, y: 10, duration: 1.2 }, '-=0.8')
          .from('.room-next', { opacity: 0, duration: 1 }, '-=0.4')
        track(tl)
      }
    },
    { scope: ref, dependencies: [showTitle] },
  )
  return (
    <div ref={ref} className="ov-stack justify-between">
      {!lightsOn && (
        <div className="ov-top text-center animate-fadein">
          <p className="font-display italic text-ivory/85 text-[clamp(1.2rem,4.5vw,1.8rem)] text-glow">{t(ui.lightHint)}</p>
        </div>
      )}
      {showTitle && (
        <div className="ov-top text-center">
          <h1 className="room-hb font-script text-gold text-[clamp(2.6rem,11vw,5.5rem)] leading-[1.1] text-glow-strong">
            Happy Birthday, {name}
          </h1>
          <p className="room-sub mt-2 font-display italic text-ivory/90 text-[clamp(1.1rem,4vw,1.6rem)]">{t(birthdayConfig.room.subtitle)}</p>
        </div>
      )}
      <div className="ov-bottom flex flex-col items-center gap-3">
        {!lightsOn ? (
          <button
            className="btn-primary"
            onClick={() => {
              audio.unlock()
              audio.chime('sparkle')
              useExperience.getState().set({ lightsOn: true })
            }}
          >
            {t(ui.lightSwitch)}
          </button>
        ) : (
          showTitle && (
            <button className="room-next btn-primary" onClick={() => useExperience.getState().next()}>
              {t(birthdayConfig.room.title)} →
            </button>
          )
        )}
      </div>
    </div>
  )
}
