import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, ArrowRight } from "lucide-react"
import Link from "next/link"
import { achievements } from "@/data/portfolio-data"

export default function HeroSection() {
  return (
    <section className="relative h-screen flex items-center px-4 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-secondary/5" />

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-3 gap-8 items-center h-full">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <Badge variant="outline" className="mb-4 text-sm font-medium">
                ZK Stellar — DoraHacks Hackathon 2025
              </Badge>
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
                <Button size="lg" className="text-lg px-8 py-6">
                  <Shield className="mr-2 h-5 w-5" />
                  Try the Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/receive">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 bg-transparent border-secondary-foreground text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary"
                >
                  Scan for Payments
                </Button>
              </Link>
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

          <div className="hidden lg:flex lg:col-span-1 h-full items-center justify-center">
            <div className="relative w-72 h-72">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
              <div className="absolute inset-8 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: "0.5s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="h-24 w-24 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
