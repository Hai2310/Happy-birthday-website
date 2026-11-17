import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

const vert = /* glsl */ `
  attribute float aPhase; uniform float uTime; uniform float uPixel; uniform float uSize;
  varying float vA;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.4 + aPhase * 6.28) * 0.6;
    p.y += sin(uTime * 0.6 + aPhase * 12.0) * 0.35;
    p.z += cos(uTime * 0.35 + aPhase * 9.0) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vA = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * 1.7 + aPhase * 40.0), 2.0);
    gl_PointSize = uSize * uPixel * (30.0 / -mv.z);
  }`
const frag = /* glsl */ `
  uniform vec3 uColor; varying float vA;
  void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d); gl_FragColor = vec4(uColor * 1.6, a*a*vA); }`

export function Fireflies({ count = 80, area = [16, 4, 16] as [number, number, number], center = [0, 1.5, 0] as [number, number, number], color = '#ffaed0', size = 6 }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(count * 3)
    const ph = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      p.set([center[0] + (Math.random() - 0.5) * area[0], center[1] + (Math.random() - 0.5) * area[1], center[2] + (Math.random() - 0.5) * area[2]], i * 3)
      ph[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1))
    return g
  }, [count, area, center])
  useEffect(() => () => geo.dispose(), [geo])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixel: { value: 1 }, uSize: { value: size }, uColor: { value: new THREE.Color(color) } }), [color, size])
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uPixel.value = s.gl.getPixelRatio()
  })
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}
