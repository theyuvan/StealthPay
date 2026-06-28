import { Shield, Code, Globe, Lock, Eye, Key, Fingerprint, Zap } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "Stealth Addresses",
    description:
      "Every payment lands at a fresh one-time address derived with EC Diffie-Hellman on secp256k1. No two payments share an address — and none can be linked to your real wallet.",
    accent: "bg-primary",
    span: "lg:col-span-5",
    large: true,
  },
  {
    icon: Code,
    title: "Groth16 ZK Proofs",
    description:
      "A Circom 2 circuit compiled with snarkjs generates a Groth16 proof entirely in-browser. Proves stealth ownership without revealing your private key.",
    accent: "bg-cyan-500",
    span: "lg:col-span-4",
    large: true,
  },
  {
    icon: Key,
    title: "Single Keypair",
    description:
      "Just two things: a public metaAddress you share, and a private metaPriv you keep. One key scans for payments and claims them.",
    span: "lg:col-span-3",
  },
  {
    icon: Globe,
    title: "Stellar Native",
    description:
      "Announcements stored on-chain via Stellar manageData. Funds move with accountMerge — no wrapped tokens, no bridges.",
    span: "lg:col-span-3",
  },
  {
    icon: Lock,
    title: "Poseidon Nullifier",
    description:
      "A ZK-friendly Poseidon hash generates a unique nullifier per proof. Stored on-chain to prevent double-claiming.",
    span: "lg:col-span-3",
  },
  {
    icon: Eye,
    title: "Selective Disclosure",
    description:
      "Recipients can choose to prove eligibility to a compliance officer via ZK — without exposing their full payment history.",
    span: "lg:col-span-3",
  },
]

export default function SkillsSection() {
  return (
    <section className="py-24 px-4 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4 text-white">
            What makes it work
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Every component chosen for cryptographic correctness and Stellar-native fit.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">

          {/* Stealth Addresses — large */}
          <div className="lg:col-span-5 rounded-3xl overflow-hidden bg-primary relative min-h-60 p-8 flex flex-col justify-end">
            <div className="absolute top-6 left-6">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Stealth Addresses</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              EC Diffie-Hellman on secp256k1 — every payment lands at a fresh one-time address that only you can recognize.
            </p>
          </div>

          {/* Groth16 — large */}
          <div className="lg:col-span-4 rounded-3xl overflow-hidden border-2 border-primary/20 bg-card relative min-h-60 p-8 flex flex-col justify-end">
            <div className="absolute top-6 left-6">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Code className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Groth16 ZK Proofs</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Circom 2 + snarkjs — prove stealth ownership in-browser without revealing your private key.
            </p>
          </div>

          {/* Single Keypair */}
          <div className="lg:col-span-3 rounded-3xl border border-primary/30 bg-card relative min-h-48 p-6 flex flex-col justify-end">
            <div className="absolute top-5 left-5">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">Single Keypair</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Public <code className="text-primary">metaAddress</code> + private <code className="text-primary">metaPriv</code> — one key for scanning and claiming.
            </p>
          </div>

          {/* Stellar Native */}
          <div className="lg:col-span-3 rounded-3xl border border-border bg-muted relative min-h-48 p-6 flex flex-col justify-end">
            <div className="absolute top-5 left-5">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">Stellar Native</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Announcements via <code className="text-primary">manageData</code>, claims via <code className="text-primary">accountMerge</code> — no wrapped tokens.
            </p>
          </div>

          {/* Poseidon / Nullifier stat */}
          <div className="lg:col-span-3 rounded-3xl border border-primary/20 bg-card relative min-h-48 p-6 flex flex-col items-center justify-center text-center">
            <Lock className="h-6 w-6 text-primary mb-3" />
            <span className="text-3xl font-bold text-primary font-heading block mb-1">Poseidon</span>
            <p className="text-muted-foreground text-xs">ZK-friendly nullifier hash — prevents double-claiming</p>
          </div>

          {/* Selective Disclosure — wide */}
          <div className="lg:col-span-3 rounded-3xl border border-primary/20 bg-card relative min-h-48 p-6 flex flex-col justify-end">
            <div className="absolute top-5 left-5">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">Selective Disclosure</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Prove eligibility to compliance officers via ZK — without exposing your full payment history.
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
