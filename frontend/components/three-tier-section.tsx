import { Send, ScanLine, ShieldCheck } from "lucide-react"

export default function ThreeTierSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold font-heading mb-6 text-white md:text-5xl">How It Works</h2>
          <p className="text-xl text-muted-foreground">Three steps. Zero address exposure.</p>
        </div>

        <div className="space-y-0 border border-border rounded-lg overflow-hidden">
          <div className="flex items-center p-6 border-b border-solid border-white">
            <div className="flex items-center min-w-0 flex-1">
              <div className="p-3 bg-primary/10 rounded-lg mr-6 shrink-0">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold font-heading text-secondary-foreground">1 — Sender derives stealth address</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Given the recipient's public meta-address (scanPub:spendPub), the sender picks a random scalar r,
                  computes shared secret S = r·Ks, and derives a one-time address P = Ksp + hash(S)·G. Posts (P, R=r·G)
                  to the registry.
                </p>
              </div>
            </div>
            <div className="ml-6 text-right shrink-0">
              <div className="text-muted-foreground text-sm">EC Diffie-Hellman</div>
              <div className="text-muted-foreground text-sm">secp256k1</div>
            </div>
          </div>

          <div className="flex items-center p-6 border-b border-solid border-white">
            <div className="flex items-center min-w-0 flex-1">
              <div className="p-3 bg-primary/10 rounded-lg mr-6 shrink-0">
                <ScanLine className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold font-heading text-secondary-foreground">2 — Recipient scans locally</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  The recipient fetches all announcements, computes S = ks·R for each, and checks if
                  hash(S)·G + Ksp = P. A match means it's theirs. The spend private key = ksp + hash(S) unlocks the
                  funds. Keys never leave the browser.
                </p>
              </div>
            </div>
            <div className="ml-6 text-right shrink-0">
              <div className="text-muted-foreground text-sm">Local scan</div>
              <div className="text-muted-foreground text-sm">Private keys stay local</div>
            </div>
          </div>

          <div className="flex items-center p-6">
            <div className="flex items-center min-w-0 flex-1">
              <div className="p-3 bg-primary/10 rounded-lg mr-6 shrink-0">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold font-heading text-secondary-foreground">3 — Prove ownership with ZK</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  A Groth16 circuit (Circom 2 + snarkjs) proves knowledge of ks and ksp that satisfy the stealth
                  derivation constraints, without revealing them. A Poseidon nullifier is stored on the Soroban
                  contract to prevent reuse.
                </p>
              </div>
            </div>
            <div className="ml-6 text-right shrink-0">
              <div className="text-muted-foreground text-sm">Groth16</div>
              <div className="text-muted-foreground text-sm">On-chain nullifier</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
