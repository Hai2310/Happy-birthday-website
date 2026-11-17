import { useEffect, useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { photos, type Photo } from '../../data/photos'
import { acquireTexture, placeholderTexture, releaseTexture } from '../../utils/textures'
import { useExperience } from '../../stores/experience'
import { tr, ui } from '../../i18n/strings'

export type FrameStyle = 'gold' | 'polaroid' | 'plain' | 'glow'

interface Props {
  index: number
  /** longest side in world units */
  size?: number
  style?: FrameStyle
  quality?: 'thumb' | 'src'
  onSelect?: (index: number, e: ThreeEvent<MouseEvent>) => void
  position?: [number, number, number]
  rotation?: [number, number, number]
  /** fixed aspect (w/h) to keep layouts uniform; photo is fit inside (contain), never stretched */
  fixedAspect?: number
  emissive?: number
}

const placeholderCache = new Map<string, THREE.Texture>()

/**
 * A photograph in 3D. Keeps the real aspect ratio (no stretching); in fixed-aspect frames the
 * photo is "contained" with a soft mat rather than cropped, so faces are never cut off.
 */
export function PhotoFrame3D({ index, size = 1.4, style = 'gold', quality = 'thumb', onSelect, position, rotation, fixedAspect, emissive = 0 }: Props) {
  const photo: Photo | undefined = photos[index]
  const lang = useExperience((s) => s.lang)
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (!photo) return
    const url = quality === 'src' ? photo.src : photo.thumb
    const { tex: t, ready } = acquireTexture(url)
    let alive = true
    ready.then(() => alive && setTex(t)).catch(() => alive && setTex(null))
    if (t.image) setTex(t)
    return () => {
      alive = false
      releaseTexture(url)
    }
  }, [photo, quality])

  const placeholder = useMemo(() => {
    const key = `${lang}-${index % 3}`
    let p = placeholderCache.get(key)
    if (!p) {
      p = placeholderTexture(tr(ui.noPhotosTitle, lang), 'public/assets/our-photos', index)
      placeholderCache.set(key, p)
    }
    return p
  }, [lang, index])

  const aspect = photo ? photo.aspect : 0.8
  const frameAspect = fixedAspect ?? aspect
  const fw = frameAspect >= 1 ? size : size * frameAspect
  const fh = frameAspect >= 1 ? size / frameAspect : size
  // contain photo within the frame opening
  const innerW0 = fw * 0.9
  const innerH0 = fh * 0.9
  let pw = innerW0
  let ph = innerW0 / aspect
  if (ph > innerH0) {
    ph = innerH0
    pw = innerH0 * aspect
  }
  const isPolaroid = style === 'polaroid'
  const border = isPolaroid ? 0.08 * size : 0.05 * size
  const bottomExtra = isPolaroid ? 0.18 * size : 0

  const frameMat = useMemo(() => {
    if (style === 'polaroid') return new THREE.MeshStandardMaterial({ color: '#fbf6ee', roughness: 0.85 })
    if (style === 'plain') return new THREE.MeshStandardMaterial({ color: '#1a1726', roughness: 0.6 })
    return new THREE.MeshStandardMaterial({ color: '#d8b987', metalness: 0.85, roughness: 0.32, emissive: '#d8b987', emissiveIntensity: style === 'glow' ? 0.35 : 0.04 })
  }, [style])
  useEffect(() => () => frameMat.dispose(), [frameMat])

  const interactive = !!onSelect
  return (
    <group position={position} rotation={rotation} scale={hover && interactive ? 1.06 : 1}>
      <mesh
        position={[0, -bottomExtra / 2, -0.02]}
        material={frameMat}
        onClick={interactive ? (e) => { e.stopPropagation(); onSelect!(index, e) } : undefined}
        onPointerOver={interactive ? (e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' } : undefined}
        onPointerOut={interactive ? () => { setHover(false); document.body.style.cursor = '' } : undefined}
      >
        <boxGeometry args={[fw + border * 2, fh + border * 2 + bottomExtra, 0.03]} />
      </mesh>
      {/* mat behind contained photo */}
      <mesh position={[0, 0, 0.0]}>
        <planeGeometry args={[fw, fh]} />
        <meshStandardMaterial color={isPolaroid ? '#efe7da' : '#14111d'} roughness={1} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={photo ? [pw, ph] : [fw, fh]} />
        <meshStandardMaterial
          map={tex ?? placeholder}
          roughness={0.55}
          emissive="#ffffff"
          emissiveMap={tex ?? placeholder}
          emissiveIntensity={0.18 + emissive}
          toneMapped
        />
      </mesh>
    </group>
  )
}
