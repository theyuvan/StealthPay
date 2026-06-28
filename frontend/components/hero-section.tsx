import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Lock, Zap, ArrowRight } from "lucide-react"
import Link from "next/link"
import { achievements } from "@/data/portfolio-data"

export default function HeroSection() {
  return (
    <section className="relative h-screen flex items-center px-4 lg:px-8 overflow-hidden">
      {/* Subtle dark gradient behind text so it reads on the 3D background */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-3 gap-8 items-center h-full">
          {/* ── Left column: hero copy ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-heading mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Pay without a trace
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-4xl leading-relaxed">
                Every payment lands at a{" "}
                <span className="text-primary font-semibold">fresh one-time address</span> only the recipient can
                recognize. When they need to prove ownership, they do it via a{" "}
                <span className="text-primary font-semibold">zero-knowledge proof</span> — no addresses, no identity,
                ever exposed.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/send">
                <Button size="lg" className="text-lg px-8 py-6 cursor-pointer">
                  <Shield className="mr-2 h-5 w-5" />
                  Try the Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 border-foreground/50 text-foreground hover:bg-foreground! hover:text-background!"
              >
                <Link href="/receive">Scan for Payments</Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
              {achievements.map((achievement, index) => (
                <div key={index}>
                  <div className="text-2xl md:text-3xl font-bold font-heading text-primary mb-1">
                    {achievement.number}
                  </div>
                  <div className="text-sm text-muted-foreground">{achievement.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right column: floating feature cards (no static shield) ─── */}
          <div className="hidden lg:flex lg:col-span-1 h-full items-center justify-end pr-4">
            <div className="space-y-4 w-64">
              {[
                { icon: Shield, label: "Stealth Addresses", sub: "One-time addresses per payment", color: "text-primary" },
                { icon: Lock,   label: "ZK Proofs",         sub: "Groth16 ownership proof",        color: "text-cyan-400" },
                { icon: Zap,    label: "Stellar Network",   sub: "Global private settlement",      color: "text-purple-400" },
              ].map(({ icon: Icon, label, sub, color }) => (
                <div
                  key={label}
                  className="p-4 rounded-xl border border-border/40 bg-background/50 backdrop-blur-sm flex items-start gap-3"
                >
                  <div className={`mt-0.5 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
