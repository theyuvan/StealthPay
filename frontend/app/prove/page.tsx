"use client"
import { useState, useEffect } from "react"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet } from "@/hooks/wallet-context"
import {
  Loader2, Shield, ShieldCheck, ShieldAlert,
  Wallet, Check, Copy, ChevronDown, ChevronUp,
  ArrowRight, ExternalLink, AlertCircle
} from "lucide-react"

const API = "http://localhost:4000"
const TESTNET_EXPLORER = "https://stellar.expert/explorer/testnet/tx"

type ProveResult = {
  proof: object
  publicSignals: string[]
  metaCommitment: string
  nullifier: string
}

type SessionData = {
  stellarProofKey: string
  metaPriv: string
  stellarAddress?: string
  amount?: string
}

export default function ProvePage() {
  const wallet = useWallet()

  // Fields
  const [stellarProofKey, setStellarProofKey] = useState("")
  const [metaPriv, setMetaPriv] = useState("")

  type ClaimStep = "idle" | "proving" | "signing" | "submitting" | "claiming"
  const [step, setStep] = useState<ClaimStep>("idle")
  const [proofResult, setProofResult] = useState<ProveResult | null>(null)
  const [claimHash, setClaimHash] = useState("")
  const [authTxHash, setAuthTxHash] = useState("")
  const [claimAmount, setClaimAmount] = useState("")
  const [claimed, setClaimed] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [showProof, setShowProof] = useState(false)

  const stepLabels: Record<ClaimStep, string> = {
    idle: "",
    proving: "Generating ZK proof…",
    signing: "Sign in wallet to authorize claim…",
    submitting: "Submitting authorization on-chain…",
    claiming: "Transferring funds to your wallet…",
  }

  // Pre-fill from sessionStorage when coming from /receive
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("proveData")
      if (!raw) return
      const data: SessionData = JSON.parse(raw)
      if (data.stellarProofKey) setStellarProofKey(data.stellarProofKey)
      if (data.metaPriv) setMetaPriv(data.metaPriv)
      sessionStorage.removeItem("proveData")
    } catch { /* ignore */ }
  }, [])

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  async function proveAndClaim() {
    if (!wallet.publicKey) return
    setError("")
    setProofResult(null)
    setClaimed(false)
    setAuthTxHash("")

    try {
      // ── Step 1: Generate ZK proof ────────────────────────────────────────────
      setStep("proving")
      const proveRes = await fetch(`${API}/zk/prove`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metaPriv, context: "01" }),
      })
      const proof: ProveResult = await proveRes.json()
      if (!proveRes.ok) throw new Error((proof as { error?: string }).error || "Proof generation failed")
      setProofResult(proof)

      // ── Step 2: Wallet signs claim authorization ─────────────────────────────
      // Builds a manageData tx that writes SHA256(nullifier) onto the recipient
      // account — proves the signer controls this address and authorizes this claim.
      setStep("signing")
      const buildRes = await fetch(`${API}/stealth/build-claim-auth-tx`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipientAddress: wallet.publicKey, nullifier: proof.nullifier }),
      })
      const { xdr, networkPassphrase, error: buildErr } = await buildRes.json()
      if (!buildRes.ok) throw new Error(buildErr || "Failed to build authorization tx")

      const signedXdr = await wallet.signTransaction(xdr, networkPassphrase)
      if (!signedXdr) throw new Error("Wallet did not sign the authorization transaction")

      // ── Step 3: Submit authorization on-chain ────────────────────────────────
      setStep("submitting")
      const submitRes = await fetch(`${API}/stealth/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signedXdr }),
      })
      const { hash: authHash, error: submitErr } = await submitRes.json()
      if (!submitRes.ok) throw new Error(submitErr || "Authorization tx failed")
      setAuthTxHash(authHash)

      // ── Step 4: Claim funds ──────────────────────────────────────────────────
      // Backend verifies ZK proof, then transfers stealth → recipient wallet
      setStep("claiming")
      const claimRes = await fetch(`${API}/stealth/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stellarProofKey,
          recipientAddress: wallet.publicKey,
          proof: proof.proof,
          publicSignals: proof.publicSignals,
        }),
      })
      const claimData = await claimRes.json()
      if (!claimRes.ok) throw new Error(claimData.error || "Claim failed")

      setClaimHash(claimData.hash)
      setClaimAmount(claimData.amount)
      setClaimed(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred")
    } finally {
      setStep("idle")
    }
  }

  const canProve = stellarProofKey.trim() && metaPriv.trim() && wallet.connected
  const isWorking = step !== "idle"

  return (
    <div className="min-h-screen bg-background dark">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-20">
        <div className="mb-10">
          <Badge variant="outline" className="mb-3 text-xs">ZK Claim</Badge>
          <h1 className="text-4xl font-bold font-heading mb-3">Prove &amp; Claim</h1>
          <p className="text-muted-foreground leading-relaxed">
            Enter your Stellar Proof Key and private keys. A Groth16 zero-knowledge proof is generated locally,
            then the stealth funds are automatically transferred to your connected wallet.
          </p>
        </div>

        {/* Wallet connection status */}
        {!wallet.connected ? (
          <div className="mb-6 p-4 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <Wallet className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Wallet not connected</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your wallet first — the claimed XLM will be sent to your connected address.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-3 rounded-md bg-primary/5 border border-primary/20 flex items-center gap-2.5">
            <Wallet className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-sm text-primary font-medium">Funds will arrive at</span>
            <span className="font-mono text-xs text-foreground ml-auto">
              {wallet.publicKey!.slice(0, 8)}…{wallet.publicKey!.slice(-6)}
            </span>
          </div>
        )}

        {/* Input form */}
        {!claimed && (
          <Card className="p-6 mb-6 bg-card border-border">
            <h2 className="text-sm font-semibold mb-4">Proof inputs</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="proofKey" className="text-sm font-medium mb-2 block">
                  Stellar Proof Key
                  <span className="text-muted-foreground font-normal ml-1 text-xs">(from /receive after scanning)</span>
                </Label>
                <Input
                  id="proofKey"
                  value={stellarProofKey}
                  onChange={e => setStellarProofKey(e.target.value)}
                  placeholder="S… (Stellar secret key of stealth account)"
                  className="font-mono text-sm"
                  type="password"
                />
              </div>
              <div>
                <Label htmlFor="metaPriv" className="text-sm font-medium mb-2 block">
                  Private Key
                  <span className="text-muted-foreground font-normal ml-1 text-xs">(from /receive page)</span>
                </Label>
                <Input
                  id="metaPriv"
                  value={metaPriv}
                  onChange={e => setMetaPriv(e.target.value)}
                  placeholder="Hex private key"
                  className="font-mono text-sm"
                  type="password"
                />
              </div>

              {/* Step-by-step progress */}
              {isWorking && (
                <div className="space-y-2">
                  {(["proving", "signing", "submitting", "claiming"] as const).map((s, i) => {
                    const labels = {
                      proving: "Generate ZK proof",
                      signing: "Sign authorization in wallet",
                      submitting: "Submit authorization on-chain",
                      claiming: "Transfer funds to wallet",
                    }
                    const stepIdx = ["proving","signing","submitting","claiming"].indexOf(step)
                    const thisIdx = i
                    const done = thisIdx < stepIdx
                    const active = thisIdx === stepIdx
                    return (
                      <div key={s} className={`flex items-center gap-3 p-2.5 rounded-md border text-sm transition-all ${
                        active ? "bg-primary/10 border-primary/30 text-foreground"
                        : done ? "bg-muted/20 border-border text-muted-foreground"
                        : "border-transparent text-muted-foreground/40"
                      }`}>
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          active ? "bg-primary text-primary-foreground"
                          : done ? "bg-muted-foreground/30 text-muted-foreground"
                          : "border border-muted-foreground/20"
                        }`}>
                          {done ? <Check className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
                        </div>
                        <span className="font-medium">{labels[s]}</span>
                        {active && s === "proving" && (
                          <span className="text-xs text-muted-foreground ml-auto">10–30 sec</span>
                        )}
                        {active && s === "signing" && (
                          <span className="text-xs text-primary ml-auto animate-pulse">Check wallet</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <Button
                onClick={proveAndClaim}
                disabled={!canProve || isWorking}
                className="w-full"
              >
                {isWorking ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{stepLabels[step]}</>
                ) : (
                  <><Shield className="mr-2 h-4 w-4" />Generate ZK Proof &amp; Claim Funds<ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </Card>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {claimed && (
          <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold font-heading mb-1">Funds Claimed!</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  <strong className="text-foreground">{parseFloat(claimAmount).toFixed(4)} XLM</strong> transferred from
                  the stealth account to your wallet. ZK proof verified on-chain.
                </p>

                <div className="space-y-2 mb-5">
                  <div className="p-2.5 rounded-md bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-0.5">Recipient wallet</p>
                    <p className="font-mono text-xs break-all">{wallet.publicKey}</p>
                  </div>
                  {authTxHash && (
                    <div className="p-2.5 rounded-md bg-muted/50 border border-border">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-muted-foreground">Authorization tx (wallet signed)</p>
                        <a href={`${TESTNET_EXPLORER}/${authTxHash}`} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <p className="font-mono text-xs break-all">{authTxHash}</p>
                    </div>
                  )}
                  <div className="p-2.5 rounded-md bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs text-muted-foreground">Funds transfer tx</p>
                      <button onClick={() => copy(claimHash, "hash")} className="text-muted-foreground hover:text-primary">
                        {copied === "hash" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                    <p className="font-mono text-xs break-all">{claimHash}</p>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <a href={`${TESTNET_EXPLORER}/${claimHash}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      View on Stellar Expert
                    </Button>
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => { setClaimed(false); setStellarProofKey(""); setScanPriv(""); setSpendPriv(""); setProofResult(null); setError("") }}>
                    Claim another
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Show ZK proof details after generation */}
        {proofResult && (
          <div className="space-y-4">
            <Card className="p-5 bg-card border-border">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                ZK Proof Generated
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Meta-commitment", value: proofResult.metaCommitment, key: "mc" },
                  { label: "Nullifier (anti-replay)", value: proofResult.nullifier, key: "nul" },
                ].map(({ label, value, key }) => (
                  <div key={key} className="p-2.5 rounded-md bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <button onClick={() => copy(value, key)} className="text-muted-foreground hover:text-primary transition-colors">
                        {copied === key ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                    <p className="font-mono text-xs break-all">{value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-card border-border overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setShowProof(v => !v)}
              >
                <span className="text-sm font-semibold">Raw proof &amp; public signals</span>
                {showProof ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {showProof && (
                <div className="border-t border-border">
                  {[
                    { label: "Proof (Groth16)", value: JSON.stringify(proofResult.proof, null, 2), key: "proof" },
                    { label: "Public signals", value: JSON.stringify(proofResult.publicSignals, null, 2), key: "sigs" },
                  ].map(({ label, value, key }) => (
                    <div key={key} className="p-4 border-b border-border last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">{label}</span>
                        <button onClick={() => copy(value, key)} className="text-muted-foreground hover:text-primary transition-colors">
                          {copied === key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <pre className="font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-all bg-muted/30 rounded-md p-3">{value}</pre>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* How it works */}
        {!claimed && (
          <div className="mt-10 p-5 rounded-lg border border-border bg-muted/20">
            <h3 className="text-sm font-semibold mb-3">How it works</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Your keys are used locally to compute a <span className="text-foreground font-medium">Groth16 ZK proof</span> via snarkjs</li>
              <li>The proof reveals only a <span className="text-foreground font-medium">meta-commitment</span> and a <span className="text-foreground font-medium">nullifier</span> — no keys or addresses</li>
              <li>The <span className="text-foreground font-medium">Stellar Proof Key</span> signs a transaction from the stealth account to your real wallet</li>
              <li>The backend verifies the ZK proof, then broadcasts the Stellar transaction</li>
              <li>Funds arrive in your wallet — the link between sender and recipient remains hidden</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  )
}
