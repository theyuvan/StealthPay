"use client"
import { Canvas, extend, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useRef, useEffect, useState } from "react"
import * as THREE from "three"
import ThreeGlobe from "three-globe"
import countries from "@/data/globe.json"

extend({ ThreeGlobe })

// Makes the WebGL renderer transparent so CSS background shows through
function TransparentRenderer() {
  const { gl } = useThree()
  useEffect(() => { gl.setClearColor(0x000000, 0) }, [gl])
  return null
}

const CAMERA_Z = 300

// ── Stealth payment connections between global financial hubs ─────────────────
const CONNECTIONS = [
  { order: 1, startLat: 40.7128, startLng: -74.006,   endLat: 51.5074,  endLng: -0.1278,   arcAlt: 0.30, color: "#eab308" }, // NYC → London
  { order: 1, startLat: 35.6762, startLng: 139.6503,  endLat: 1.3521,   endLng: 103.8198,  arcAlt: 0.22, color: "#06b6d4" }, // Tokyo → Singapore
  { order: 2, startLat: 48.8566, startLng: 2.3522,    endLat: 25.2048,  endLng: 55.2708,   arcAlt: 0.35, color: "#eab308" }, // Paris → Dubai
  { order: 2, startLat: -33.868, startLng: 151.2093,  endLat: 31.2304,  endLng: 121.4737,  arcAlt: 0.20, color: "#a855f7" }, // Sydney → Shanghai
  { order: 3, startLat: 37.7749, startLng: -122.4194, endLat: 19.4326,  endLng: -99.1332,  arcAlt: 0.18, color: "#06b6d4" }, // SF → Mexico City
  { order: 3, startLat: 52.52,   startLng: 13.405,    endLat: -1.2921,  endLng: 36.8219,   arcAlt: 0.42, color: "#eab308" }, // Berlin → Nairobi
  { order: 4, startLat: 55.7558, startLng: 37.6176,   endLat: 28.6139,  endLng: 77.209,    arcAlt: 0.30, color: "#a855f7" }, // Moscow → Delhi
  { order: 4, startLat: -22.906, startLng: -43.1729,  endLat: 40.7128,  endLng: -74.006,   arcAlt: 0.42, color: "#06b6d4" }, // Rio → NYC
  { order: 5, startLat: 43.6532, startLng: -79.3832,  endLat: 48.8566,  endLng: 2.3522,    arcAlt: 0.35, color: "#eab308" }, // Toronto → Paris
  { order: 5, startLat: 34.0522, startLng: -118.2437, endLat: 35.6762,  endLng: 139.6503,  arcAlt: 0.47, color: "#06b6d4" }, // LA → Tokyo
  { order: 6, startLat: 1.3521,  startLng: 103.8198,  endLat: 51.5074,  endLng: -0.1278,   arcAlt: 0.52, color: "#eab308" }, // Singapore → London
  { order: 6, startLat: 25.2048, startLng: 55.2708,   endLat: 40.7128,  endLng: -74.006,   arcAlt: 0.50, color: "#a855f7" }, // Dubai → NYC
  { order: 7, startLat: 41.9028, startLng: 12.4964,   endLat: 34.0522,  endLng: -118.2437, arcAlt: 0.45, color: "#eab308" }, // Rome → LA
  { order: 7, startLat: -26.204, startLng: 28.0473,   endLat: 51.5074,  endLng: -0.1278,   arcAlt: 0.50, color: "#06b6d4" }, // Johannesburg → London
  { order: 8, startLat: 59.9311, startLng: 30.3609,   endLat: 31.2304,  endLng: 121.4737,  arcAlt: 0.35, color: "#eab308" }, // St Pete → Shanghai
  { order: 8, startLat: 19.4326, startLng: -99.1332,  endLat: 48.8566,  endLng: 2.3522,    arcAlt: 0.40, color: "#a855f7" }, // Mexico City → Paris
  { order: 9, startLat: 22.3193, startLng: 114.1694,  endLat: 37.7749,  endLng: -122.4194, arcAlt: 0.48, color: "#eab308" }, // HK → SF
  { order: 9, startLat: -34.603, startLng: -58.3816,  endLat: 52.52,    endLng: 13.405,    arcAlt: 0.52, color: "#06b6d4" }, // Buenos Aires → Berlin
]

// ── Globe (re-uses ThreeGlobe via r3f extend) ─────────────────────────────────
function GlobeInScene() {
  const groupRef = useRef<THREE.Group>(null!)
  const globeRef = useRef<ThreeGlobe | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!groupRef.current || globeRef.current) return
    const g = new ThreeGlobe()
    groupRef.current.add(g)
    globeRef.current = g
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || !globeRef.current) return
    const mat = globeRef.current.globeMaterial() as unknown as {
      color: THREE.Color; emissive: THREE.Color; emissiveIntensity: number; shininess: number
    }
    mat.color = new THREE.Color("#03050f")
    mat.emissive = new THREE.Color("#060d22")
    mat.emissiveIntensity = 0.4
    mat.shininess = 0.6
  }, [ready])

  useEffect(() => {
    if (!ready || !globeRef.current) return

    const pts: { lat: number; lng: number; color: string }[] = []
    CONNECTIONS.forEach(c => {
      pts.push({ lat: c.startLat, lng: c.startLng, color: c.color })
      pts.push({ lat: c.endLat,   lng: c.endLng,   color: c.color })
    })
    const unique = pts.filter((v, i, a) =>
      a.findIndex(u => u.lat === v.lat && u.lng === v.lng) === i
    )

    globeRef.current
      .hexPolygonsData((countries as { features: object[] }).features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.7)
      .showAtmosphere(true)
      .atmosphereColor("#eab308")
      .atmosphereAltitude(0.18)
      .hexPolygonColor(() => "rgba(234,179,8,0.13)")
      .arcsData(CONNECTIONS)
      .arcStartLat((d) => (d as typeof CONNECTIONS[0]).startLat)
      .arcStartLng((d) => (d as typeof CONNECTIONS[0]).startLng)
      .arcEndLat((d)   => (d as typeof CONNECTIONS[0]).endLat)
      .arcEndLng((d)   => (d as typeof CONNECTIONS[0]).endLng)
      .arcColor((d)    => (d as typeof CONNECTIONS[0]).color)
      .arcAltitude((d) => (d as typeof CONNECTIONS[0]).arcAlt)
      .arcStroke(0.5)
      .arcDashLength(0.9)
      .arcDashInitialGap((d) => (d as typeof CONNECTIONS[0]).order)
      .arcDashGap(15)
      .arcDashAnimateTime(2000)
      .pointsData(unique)
      .pointColor((d) => (d as { color: string }).color)
      .pointsMerge(true)
      .pointAltitude(0)
      .pointRadius(2)
  }, [ready])

  return <group ref={groupRef} />
}

// ── Main exported background component ───────────────────────────────────────
export function ZKStellarBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, CAMERA_Z], fov: 50, near: 180, far: 1800 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <TransparentRenderer />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[-400, 100, 400]} intensity={0.8} />
        <pointLight color="#eab308" position={[200, 200, 150]} intensity={0.45} />
        <pointLight color="#06b6d4" position={[-200, -100, 120]} intensity={0.35} />

        {/* Fog makes far objects fade into darkness */}
        <fog attach="fog" args={[0x000000, 500, 1600]} />

        <GlobeInScene />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
          autoRotate={true}
          autoRotateSpeed={0.35}
        />
      </Canvas>
    </div>
  )
}
