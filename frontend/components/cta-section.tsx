import { Button } from "@/components/ui/button"
import { Send, ScanLine, ShieldCheck, ArrowRight } from "lucide-react"
import Link from "next/link"

const actions = [
  {
    href: "/send",
    icon: Send,
    title: "Send a Payment",
    description: "Enter a recipient's metaAddress and send XLM to a fresh stealth address — no identity attached.",
  },
  {
    href: "/receive",
    icon: ScanLine,
    title: "Scan for Payments",
    description: "Use your metaPriv to scan all announcements and find payments intended for you.",
  },
  {
    href: "/prove",
    icon: ShieldCheck,
    title: "Generate ZK Proof",
    description: "Prove ownership of a stealth payment and claim the XLM — all in-browser, no keys exposed.",
  },
]

export default function CTASection() {
  return (
    <section className="py-24 px-4 bg-muted/10 border-t border-border">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4 text-white">
            Try the full privacy flow
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Send, receive, and prove — every step runs in your browser on Stellar Testnet.
            Connect your xBull wallet and start in under a minute.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {actions.map(({ href, icon: Icon, title, description }) => (
            <Link key={href} href={href} className="group block">
              <div className="h-full p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                  {title}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
