import { Key, Send, ScanLine, ShieldCheck, ArrowRight } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Key,
    title: "Get your metaAddress",
    description:
      "Generate a single keypair: a public metaAddress you share freely, and a private metaPriv you keep secret. " +
      "The metaAddress is your stealth identity — like an email address, but for private payments.",
    detail: "One keypair, always",
    tech: "secp256k1 keygen",
  },
  {
    number: "02",
    icon: Send,
    title: "Sender pays privately",
    description:
      "The sender enters your metaAddress, picks a random secret, and derives a one-time stealth address just for this payment using EC Diffie-Hellman. " +
      "They send XLM to that address and post a public announcement — a hint only you can decode.",
    detail: "One-time address per payment",
    tech: "ECDH · manageData",
  },
  {
    number: "03",
    icon: ScanLine,
    title: "Scan & find your payment",
    description:
      "You fetch all public announcements and scan them locally using your metaPriv. " +
      "For each hint, your key checks if the derived address matches — a match means that payment is yours. " +
      "Nothing is sent to any server.",
    detail: "Private keys stay in your browser",
    tech: "Local scan · no server",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Prove ownership & claim",
    description:
      "To withdraw funds, you generate a Groth16 ZK proof in-browser that proves you know the private key controlling the stealth address — " +
      "without revealing the key itself. The proof is verified on-chain and a Poseidon nullifier prevents replay.",
    detail: "Zero-knowledge, one-shot",
    tech: "Circom · snarkjs · Groth16",
  },
]

export default function ThreeTierSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-white">How It Works</h2>
          <p className="text-xl text-muted-foreground">
            From a shared public key to private on-chain payments — four steps.
          </p>
        </div>

        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-8 top-8 bottom-8 w-px bg-border hidden md:block" />

          <div className="space-y-4">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <div
                  key={step.number}
                  className="relative flex gap-6 p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors group"
                >
                  {/* Step number circle */}
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center relative z-10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground">{step.number}</span>
                        <h3 className="text-lg font-bold font-heading text-foreground">{step.title}</h3>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {step.tech}
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-2">{step.description}</p>
                    <p className="text-xs text-primary/70 font-medium">{step.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Summary bar */}
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap text-sm text-muted-foreground">
          <span className="text-foreground font-semibold">metaAddress</span>
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
          <span>Stealth Address</span>
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
          <span>Announcement</span>
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
          <span className="text-foreground font-semibold">metaPriv scan</span>
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
          <span>ZK Proof</span>
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
          <span className="text-foreground font-semibold">Claim XLM</span>
        </div>
      </div>
    </section>
  )
}
