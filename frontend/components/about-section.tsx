import { Card, CardContent } from "@/components/ui/card"
import { EyeOff, LinkIcon, ShieldAlert } from "lucide-react"

const problems = [
  {
    icon: EyeOff,
    title: "Your address is public",
    body: "Every transaction you send or receive is permanently linked to your wallet address. Anyone with your address can see your full payment history.",
  },
  {
    icon: LinkIcon,
    title: "Payments are traceable",
    body: "On-chain analytics tools can map your financial life in seconds — who paid you, how much, and when. There's no opt-out.",
  },
  {
    icon: ShieldAlert,
    title: "Real-world risk",
    body: "For remittance workers, humanitarian aid recipients, and activists, a public wallet address is not just a privacy leak — it's a safety threat.",
  },
]

export default function AboutSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Problem framing */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6 text-white">
            Blockchain payments have a privacy problem.
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Every XLM transaction on Stellar is public. Your address is a permanent record that anyone can read.
            ZK Stellar fixes this — without breaking compliance.
          </p>
        </div>

        {/* Problem cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {problems.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-6 bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-0">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="text-lg font-bold font-heading mb-2 text-foreground">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Solution split */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="p-8 border-primary/20 bg-primary/5">
            <CardContent className="p-0">
              <h3 className="text-2xl font-bold font-heading mb-4 text-primary">Stealth Addresses</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Share your <span className="text-foreground font-mono text-sm">metaAddress</span> once — publicly, like a username.
                Every sender derives a <strong className="text-foreground">fresh one-time address</strong> just for
                that payment using EC Diffie-Hellman on secp256k1.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Nobody watching the chain can link that one-time address back to you. Only you — using your
                <span className="text-foreground font-mono text-sm"> metaPriv</span> — can recognize it as yours.
              </p>
            </CardContent>
          </Card>

          <Card className="p-8 border-border bg-card">
            <CardContent className="p-0">
              <h3 className="text-2xl font-bold font-heading mb-4 text-primary">ZK Linkability Proof</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                When you need to prove ownership — to claim funds, pass compliance, or confirm eligibility — you
                generate a <strong className="text-foreground">Groth16 zero-knowledge proof</strong> in your browser.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The proof convinces any verifier that you control the stealth address, without revealing your private
                key, your real identity, or any other address you own. A Poseidon nullifier prevents replay.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
