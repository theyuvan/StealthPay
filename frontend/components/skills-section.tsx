import { Card, CardContent } from "@/components/ui/card"
import { Shield, Code, Globe, Lock, Eye, Zap } from "lucide-react"

const techStack = [
  {
    icon: Shield,
    label: "Stealth Addresses",
    description: "EC math over secp256k1 — one-time addresses derived from public meta-address",
    large: true,
  },
  {
    icon: Code,
    label: "Groth16 ZK Proofs",
    description: "Circom 2 + SnarkJS: prove ownership without revealing keys",
    large: false,
  },
  {
    icon: Globe,
    label: "Stellar / Soroban",
    description: "Rust smart contracts — registry + nullifier store on Testnet",
    stat: null,
  },
  {
    icon: Lock,
    label: "Poseidon Hash",
    description: "ZK-friendly hash for nullifiers inside the circuit",
    stat: null,
  },
  {
    icon: Eye,
    label: "Selective Disclosure",
    description: "View keys + ZK proofs for compliant privacy",
    wide: true,
  },
]

export default function SkillsSection() {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-6 text-white">Tech Stack</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Every layer chosen for correctness, auditability, and Stellar-native integration.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12">
          {/* Stealth Addresses - Large Card */}
          <Card className="bg-primary relative h-60 overflow-hidden rounded-3xl md:col-span-3 md:row-span-2 md:h-[400px] lg:col-span-5 lg:h-full">
            <CardContent className="flex h-full flex-col justify-end p-6 relative z-10">
              <h3 className="text-primary-foreground text-left text-xl font-bold mb-2">Stealth Addresses</h3>
              <p className="text-primary-foreground/80 text-sm">
                EC Diffie-Hellman on secp256k1. Every payment lands at a fresh address — only recipient can recognize
                it.
              </p>
              <div className="absolute left-6 top-6 z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary" />
          </Card>

          {/* Groth16 ZK - Medium Card */}
          <Card className="relative h-60 overflow-hidden rounded-3xl md:col-span-3 md:row-span-2 md:h-[400px] lg:col-span-4 lg:h-[400px] border-2 border-primary/20">
            <CardContent className="flex h-full flex-col justify-end p-6 relative z-10">
              <h3 className="text-left text-xl font-bold mb-2 text-white">Groth16 ZK Proofs</h3>
              <p className="text-muted-foreground text-sm">
                Circom 2 circuit + SnarkJS. Prove stealth ownership without revealing scan or spend keys.
              </p>
              <div className="absolute left-6 top-6 z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <Code className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-background/80" />
          </Card>

          {/* Stellar / Soroban */}
          <Card className="relative h-60 overflow-hidden md:col-span-2 md:row-span-1 md:h-[190px] lg:col-span-3 lg:h-[190px] bg-muted rounded-3xl border-primary border-solid border">
            <CardContent className="flex h-full flex-col justify-end p-6">
              <h3 className="text-left text-lg font-bold mb-2">Stellar / Soroban</h3>
              <p className="text-muted-foreground text-sm">
                Rust smart contracts deployed to Testnet — announcement registry and nullifier store
              </p>
              <div className="absolute left-6 top-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Poseidon Stats */}
          <Card className="relative h-60 rounded-3xl md:col-span-2 md:row-span-1 md:h-[190px] lg:col-span-3 lg:h-[190px] border-primary/50 border">
            <CardContent className="flex h-full flex-col items-center justify-center p-6">
              <div className="mb-3">
                <span className="text-4xl font-bold text-primary md:text-3xl lg:text-4xl">Groth16</span>
              </div>
              <p className="text-muted-foreground text-center text-sm">Proof system + Poseidon ZK hash</p>
            </CardContent>
          </Card>

          {/* Selective Disclosure - Wide Card */}
          <Card className="relative h-60 overflow-hidden rounded-3xl md:col-span-4 md:row-span-1 md:h-[190px] lg:col-span-6 lg:h-[190px] border border-primary/30">
            <CardContent className="flex h-full flex-col justify-center p-6">
              <div className="flex items-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mr-4">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-left text-lg font-bold mb-1">Selective Disclosure</h3>
                  <p className="text-muted-foreground text-sm">
                    View keys + ZK proofs let recipients prove eligibility to compliance officers without revealing
                    addresses — compliant privacy, not anonymous mixing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
