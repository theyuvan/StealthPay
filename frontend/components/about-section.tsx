import { Card, CardContent } from "@/components/ui/card"

export default function AboutSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-6 text-white">
            Your wallet address is a surveillance target.
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Documented kidnapping and extortion incidents are linked to{" "}
            <span className="text-primary font-semibold">public blockchain addresses</span>. For remittance workers,
            humanitarian aid recipients, and anyone who values safety — permanent watchable addresses are a real-world
            threat.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <h3 className="text-2xl font-bold font-heading mb-4 text-primary">Stealth Addresses</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Instead of a permanent wallet, every incoming payment lands at a fresh one-time address derived from
                the recipient's public meta-address using EC Diffie-Hellman on secp256k1.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Only the recipient can recognize which addresses are theirs — even when scanning all public
                announcements. The sender never learns the private spend key.
              </p>
            </CardContent>
          </Card>

          <Card className="p-8 hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <h3 className="text-2xl font-bold font-heading mb-4 text-primary">ZK Linkability Proof</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When a recipient needs to prove ownership or eligibility to a trusted party — a compliance officer, an
                aid coordinator — they generate a Groth16 zero-knowledge proof.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The proof convinces the verifier without revealing scan keys, spend keys, or the stealth addresses
                themselves. A nullifier stored on-chain prevents replay.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="p-8 bg-primary/5 border-primary/20">
          <CardContent className="p-0 text-center">
            <h3 className="text-2xl font-bold font-heading mb-4">Compliant Privacy</h3>
            <p className="text-lg leading-relaxed max-w-3xl mx-auto">
              This is not anonymous mixing. View keys + ZK selective disclosure let recipients prove eligibility
              without burning their privacy. Built for{" "}
              <span className="text-primary font-semibold">Stellar's remittance and humanitarian aid use cases</span>{" "}
              — UNHCR, MoneyGram, and cross-border workers who need safety, not anonymity.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
