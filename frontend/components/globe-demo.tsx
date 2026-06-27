"use client"
import { motion } from "motion/react"
import dynamic from "next/dynamic"

const World = dynamic(() => import("@/components/ui/globe").then((m) => m.World), {
  ssr: false,
})

export default function GlobeDemo() {
  const globeConfig = {
    pointSize: 4,
    globeColor: "#03050f",
    showAtmosphere: true,
    atmosphereColor: "#eab308",
    atmosphereAltitude: 0.18,
    emissive: "#060d22",
    emissiveIntensity: 0.4,
    shininess: 0.6,
    polygonColor: "rgba(234,179,8,0.15)",
    ambientLight: "#404040",
    directionalLeftLight: "#ffffff",
    directionalTopLight: "#ffffff",
    pointLight: "#eab308",
    arcTime: 1800,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
    autoRotate: true,
    autoRotateSpeed: 0.5,
  }

  const colors = ["#eab308", "#06b6d4", "#a855f7"]

  const connections = [
    { order: 1, startLat: 40.7128, startLng: -74.006,   endLat: 51.5074,  endLng: -0.1278,   arcAlt: 0.30, color: colors[0] },
    { order: 1, startLat: 35.6762, startLng: 139.6503,  endLat: 1.3521,   endLng: 103.8198,  arcAlt: 0.22, color: colors[1] },
    { order: 2, startLat: 48.8566, startLng: 2.3522,    endLat: 25.2048,  endLng: 55.2708,   arcAlt: 0.35, color: colors[0] },
    { order: 2, startLat: -33.868, startLng: 151.2093,  endLat: 31.2304,  endLng: 121.4737,  arcAlt: 0.20, color: colors[2] },
    { order: 3, startLat: 37.7749, startLng: -122.4194, endLat: 19.4326,  endLng: -99.1332,  arcAlt: 0.18, color: colors[1] },
    { order: 3, startLat: 52.52,   startLng: 13.405,    endLat: -1.2921,  endLng: 36.8219,   arcAlt: 0.42, color: colors[0] },
    { order: 4, startLat: 55.7558, startLng: 37.6176,   endLat: 28.6139,  endLng: 77.209,    arcAlt: 0.30, color: colors[2] },
    { order: 4, startLat: -22.906, startLng: -43.1729,  endLat: 40.7128,  endLng: -74.006,   arcAlt: 0.42, color: colors[1] },
    { order: 5, startLat: 43.6532, startLng: -79.3832,  endLat: 48.8566,  endLng: 2.3522,    arcAlt: 0.35, color: colors[0] },
    { order: 5, startLat: 34.0522, startLng: -118.2437, endLat: 35.6762,  endLng: 139.6503,  arcAlt: 0.47, color: colors[1] },
    { order: 6, startLat: 1.3521,  startLng: 103.8198,  endLat: 51.5074,  endLng: -0.1278,   arcAlt: 0.52, color: colors[0] },
    { order: 6, startLat: 25.2048, startLng: 55.2708,   endLat: 40.7128,  endLng: -74.006,   arcAlt: 0.50, color: colors[2] },
    { order: 7, startLat: 41.9028, startLng: 12.4964,   endLat: 34.0522,  endLng: -118.2437, arcAlt: 0.45, color: colors[0] },
    { order: 7, startLat: -26.204, startLng: 28.0473,   endLat: 51.5074,  endLng: -0.1278,   arcAlt: 0.50, color: colors[1] },
    { order: 8, startLat: 22.3193, startLng: 114.1694,  endLat: 37.7749,  endLng: -122.4194, arcAlt: 0.48, color: colors[0] },
    { order: 8, startLat: -34.603, startLng: -58.3816,  endLat: 52.52,    endLng: 13.405,    arcAlt: 0.52, color: colors[1] },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative">
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent rounded-full" />

      <div className="max-w-full mx-auto w-full relative overflow-hidden h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center mb-8 relative z-20"
        >
          <h3 className="text-lg md:text-xl font-bold text-primary mb-2">
            Private Global Payments
          </h3>
          <p className="text-sm md:text-base font-normal text-muted-foreground max-w-md mx-auto">
            Stealth transactions flowing between financial hubs — no trace, no identity
          </p>
        </motion.div>

        <div className="absolute w-full bottom-0 inset-x-0 h-20 bg-gradient-to-b pointer-events-none select-none from-transparent to-background z-40" />
        <div className="absolute w-full -bottom-10 h-full z-10">
          <World data={connections} globeConfig={globeConfig} />
        </div>
      </div>
    </div>
  )
}
