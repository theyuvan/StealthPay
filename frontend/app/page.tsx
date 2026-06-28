"use client"
import dynamic from "next/dynamic"
import HeroSection from "@/components/hero-section"
import AboutSection from "@/components/about-section"
import SkillsSection from "@/components/skills-section"
import ThreeTierSection from "@/components/three-tier-section"
import CTASection from "@/components/cta-section"
import Footer from "@/components/footer"
import Navbar from "@/components/navbar"

const ZKStellarBackground = dynamic(
  () => import("@/components/zk-scene").then((m) => m.ZKStellarBackground),
  { ssr: false }
)

export default function HomePage() {
  return (
    <div className="min-h-screen dark">
      {/* 3D canvas sits at z-0 — fixed full-viewport */}
      <ZKStellarBackground />

      {/* All page content at z-10 — renders above the canvas */}
      <div className="relative z-10">
        <Navbar />

        {/* Hero is transparent — lets the globe show through */}
        <HeroSection />

        {/* Sections below hero have solid bg so globe doesn't distract */}
        <div className="bg-background">
          <AboutSection />
          <ThreeTierSection />
          <SkillsSection />
          <CTASection />
          <Footer />
        </div>
      </div>
    </div>
  )
}
