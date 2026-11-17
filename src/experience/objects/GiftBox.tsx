import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { track } from '../camera/CinematicCamera'
import { glowTexture } from '../../utils/textures'

const S = 1.3 // box size
export function GiftBox({ open, onClick, onOpened }: { open: boolean; onClick: () => void; onOpened?: () => void }) {
  const root = useRef<THREE.Group>(null)
  const lid = useRef<THREE.Group>(null)
  const ribbons = useRef<THREE.Group>(null)
  const bow = useRef<THREE.Group>(null)
  const light = useRef<THREE.Sprite>(null)
  const inner = useRef<THREE.PointLight>(null)
  const glowTex = useMemo(() => glowTexture('255,214,150'), [])
  const ivory = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#fbf4ea', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, sheen: 0.4 }), [])
  const satin = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#e7a2b6', roughness: 0.28, sheen: 1, sheenColor: '#ffd9e4', sheenRoughness: 0.3, clearcoat: 0.3 }), [])
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8b987', metalness: 1, roughness: 0.22 }), [])
  useEffect(() => () => { ivory.dispose(); satin.dispose(); gold.dispose(); glowTex.dispose() }, [ivory, satin, gold, glowTex])

  useFrame((s) => {
    if (!root.current || open) return
    root.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.4) * 0.3 + 0.5
    root.current.position.y = Math.sin(s.clock.elapsedTime * 1.2) * 0.03
  })

  useEffect(() => {
    if (!open || !lid.current || !ribbons.current || !bow.current || !light.current || !inner.current || !root.current) return
    const tl = gsap.timeline({ onComplete: onOpened })
    tl.to(root.current.rotation, { y: 0.35, duration: 0.8, ease: 'power2.out' })
      .to(bow.current.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.6, ease: 'back.in(2)' }, 0.2)
      .to(bow.current.rotation, { y: Math.PI * 2, duration: 0.6 }, 0.2)
      .to(ribbons.current.scale, { x: 1.04, z: 1.04, duration: 0.2 }, 0.7)
      .to(ribbons.current.scale, { y: 0.001, duration: 0.9, ease: 'power3.in' }, 0.9)
      .to(lid.current.position, { y: S * 0.5 + 1.4, x: -1.2, duration: 1.4, ease: 'power3.out' }, 1.6)
      .to(lid.current.rotation, { z: 0.9, x: -0.3, duration: 1.4, ease: 'power3.out' }, 1.6)
      .to(inner.current, { intensity: 30, duration: 1.4 }, 1.7)
      .to(light.current.scale, { x: 5, y: 5, duration: 1.8, ease: 'power2.out' }, 1.7)
      .to(light.current.material, { opacity: 0.9, duration: 1.2 }, 1.7)
    track(tl)
    return () => { tl.kill() }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const band = 0.18
  return (
    <group ref={root} onClick={(e) => { e.stopPropagation(); onClick() }} onPointerOver={() => (document.body.style.cursor = open ? '' : 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
      {/* base */}
      <mesh position={[0, S * 0.42, 0]} material={ivory} castShadow receiveShadow>
        <boxGeometry args={[S, S * 0.84, S]} />
      </mesh>
      {/* gold inner rim */}
      <mesh position={[0, S * 0.84 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[S * 0.94, S * 0.94]} />
        <meshStandardMaterial color="#3a2414" emissive="#ffcf8a" emissiveIntensity={0.3} />
      </mesh>
      <group ref={ribbons}>
        <mesh position={[0, S * 0.42, 0]} material={satin}>
          <boxGeometry args={[band, S * 0.84 + 0.01, S + 0.01]} />
        </mesh>
        <mesh position={[0, S * 0.42, 0]} material={satin}>
          <boxGeometry args={[S + 0.01, S * 0.84 + 0.01, band]} />
        </mesh>
      </group>
      {/* lid */}
      <group ref={lid} position={[0, S * 0.84, 0]}>
        <mesh position={[0, 0.1, 0]} material={ivory} castShadow>
          <boxGeometry args={[S + 0.08, 0.2, S + 0.08]} />
        </mesh>
        <mesh position={[0, 0.1, 0]} material={satin}>
          <boxGeometry args={[band, 0.21, S + 0.09]} />
        </mesh>
        <mesh position={[0, 0.1, 0]} material={satin}>
          <boxGeometry args={[S + 0.09, 0.21, band]} />
        </mesh>
        <mesh position={[0, 0.005, 0]} material={gold}>
          <boxGeometry args={[S + 0.09, 0.02, S + 0.09]} />
        </mesh>
        <group ref={bow} position={[0, 0.26, 0]}>
          {[-1, 1].map((d) => (
            <mesh key={d} position={[d * 0.2, 0.06, 0]} rotation={[0, 0, d * 0.5]} scale={[1.3, 0.7, 0.6]} material={satin}>
              <torusGeometry args={[0.16, 0.06, 12, 24]} />
            </mesh>
          ))}
          <mesh material={satin}>
            <sphereGeometry args={[0.09, 16, 12]} />
          </mesh>
          {[-1, 1].map((d) => (
            <mesh key={d} position={[d * 0.18, -0.02, 0.12]} rotation={[0.6, 0, d * 0.7]} material={satin}>
              <boxGeometry args={[0.1, 0.36, 0.015]} />
            </mesh>
          ))}
        </group>
      </group>
      <pointLight ref={inner} position={[0, S * 0.9, 0]} intensity={0} distance={6} color="#ffd29a" />
      <sprite ref={light} position={[0, S * 1.1, 0]} scale={[0.01, 0.01, 1]}>
        <spriteMaterial map={glowTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  )
}
