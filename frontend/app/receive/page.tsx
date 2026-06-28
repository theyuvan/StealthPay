"use client"
import { useState, useEffect } from "react"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet } from "@/hooks/wallet-context"
import { Loader2, ScanLine, Key, Copy, Check, ExternalLink, Eye, EyeOff, ArrowRight } from "lucide-react"

const API = "http://localhost:4000"

type Announcement = {
  id: number
  stealthAddress: string
  ephemeralR: string
  stellarAddress?: string
  stellarSecret?: string
  timestamp: number
  metadata?: { amount?: string; txHash?: string }
  balance?: string | null
}

type MetaKeys = {
  metaAddress: string
  metaPriv?: string
  txHash?: string
  onChain?: boolean
}

type RegisterStep = "idle" | "generating" | "signing" | "submitting" | "finalizing"

export default function ReceivePage() {
  const wallet = useWallet()
  const [metaPriv, setMetaPriv] = useState("")
  const [results, setResults] = useState<Announcement[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [registerStep, setRegisterStep] = useState<RegisterStep>("idle")
  const [error, setError] = useState("")
  const [generatedKeys, setGeneratedKeys] = useState<MetaKeys | null>(null)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [checkingRegistry, setCheckingRegistry] = useState(false)
  const [showPriv, setShowPriv] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const generating = registerStep !== "idle"

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  // On wallet connect: fetch canonical meta-address from backend only.
  useEffect(() => {
    if (!wallet.publicKey) {
      setAlreadyRegistered(false)
      setGeneratedKeys(null)
      setCheckingRegistry(false)
      return
    }

    setCheckingRegistry(true)
    fetch(`${API}/keys/meta/${wallet.publicKey}`)
      .then(r => r.json())
      .then(d => {
        if (d.exists) {
          setGeneratedKeys({ metaAddress: d.metaAddress, txHash: d.txHash, onChain: d.onChain })
          setAlreadyRegistered(true)
        } else {
          setAlreadyRegistered(false)
        }
      })
      .catch(() => {})
      .finally(() => setCheckingRegistry(false))
  }, [wallet.publicKey])

  async function apiFetch(url: string, options?: RequestInit) {
    const res = await fetch(url, options)
    const text = await res.text()
    if (text.trimStart().startsWith("<")) {
      throw new Error("Backend not reachable or not restarted — please run: cd backend && node index.js")
    }
    const data = JSON.parse(text)
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
    return data
  }

  async function generateAndRegister() {
    if (!wallet.publicKey) {
      setError("Connect your wallet first — the meta-address will be permanently linked on-chain.")
      return
    }
    if (alreadyRegistered || checkingRegistry || generating) return
    setError("")

    try {
      // Step 1 — Generate fresh single keypair
      setRegisterStep("generating")
      const keys = await apiFetch(`${API}/keys/generate`, { method: "POST" })

      // Step 2 — Build manageData tx: stores SHA256(metaAddress) on the wallet account
      const { xdr, networkPassphrase } = await apiFetch(`${API}/keys/build-register-tx`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet.publicKey, metaAddress: keys.metaAddress }),
      })

      // Step 3 — Wallet signs (proves this wallet owner authorized the meta-address)
      setRegisterStep("signing")
      const signedXdr = await wallet.signTransaction(xdr, networkPassphrase)
      if (!signedXdr) throw new Error("Wallet did not return a signed transaction")

      // Step 4 — Submit to Stellar testnet
      setRegisterStep("submitting")
      const { hash: txHash } = await apiFetch(`${API}/stealth/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signedXdr }),
      })

      // Step 5 — Store permanently in backend registry with txHash as proof
      setRegisterStep("finalizing")
      await apiFetch(`${API}/keys/finalize-registration`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet.publicKey, metaAddress: keys.metaAddress, txHash }),
      })

      setGeneratedKeys({ metaAddress: keys.metaAddress, metaPriv: keys.metaPriv, txHash, onChain: true })
      setMetaPriv(keys.metaPriv)
      setAlreadyRegistered(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed")
    } finally {
      setRegisterStep("idle")
    }
  }

  async function scanPayments() {
    setError("")
    setResults(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/stealth/scan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metaPriv }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Scan failed")

      const withBalances = await Promise.all(
        (data.announcements || []).map(async (ann: Announcement) => {
          if (!ann.stellarAddress) return ann
          try {
            const br = await fetch(`${API}/stealth/balance/${ann.stellarAddress}`)
            const bd = await br.json()
            return { ...ann, balance: bd.balance }
          } catch { return ann }
        })
      )
      // Only show payments that still have a positive balance (not yet claimed)
      const unclaimed = withBalances.filter(ann =>
        ann.balance != null && parseFloat(ann.balance) > 0
      )
      setResults(unclaimed)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  function goToProve(ann: Announcement) {
    if (!ann.stellarSecret) return
    sessionStorage.setItem("proveData", JSON.stringify({
      stellarProofKey: ann.stellarSecret,
      metaPriv,
      stellarAddress: ann.stellarAddress,
      amount: ann.balance,
    }))
    window.location.href = "/prove"
  }

  return (
    <div className="min-h-screen bg-background dark">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-20">
        <div className="mb-10">
          <Badge variant="outline" className="mb-3 text-xs">Recipient</Badge>
          <h1 className="text-4xl font-bold font-heading mb-3">Scan for Payments</h1>
          <p className="text-muted-foreground leading-relaxed">
            Generate your meta-address (linked to your wallet on-chain), scan for incoming payments,
            then claim them to your real wallet via ZK proof.
          </p>
        </div>

        {/* Wallet-linked meta-address */}
        <Card className="p-6 mb-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">Your Meta-Address</h2>
              {wallet.connected && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {alreadyRegistered
                    ? <>Permanent — linked to {wallet.publicKey!.slice(0, 6)}…{wallet.publicKey!.slice(-4)}</>
                    : <>Linked to {wallet.publicKey!.slice(0, 6)}…{wallet.publicKey!.slice(-4)}</>}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={generateAndRegister}
              disabled={generating || alreadyRegistered || checkingRegistry} className="text-xs hover:bg-foreground! hover:text-background! cursor-pointer">
              {checkingRegistry
                ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Checking…</>
                : registerStep === "generating"
                  ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Generating…</>
                  : registerStep === "signing"
                    ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Sign in wallet…</>
                    : registerStep === "submitting"
                      ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Submitting on-chain…</>
                      : registerStep === "finalizing"
                        ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Finalizing…</>
                        : alreadyRegistered
                          ? <><Check className="mr-1.5 h-3 w-3" />Registered on-chain</>
                          : <><Key className="mr-1.5 h-3 w-3" />Generate &amp; Register On-chain</>}
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="metaPriv" className="text-sm font-medium mb-2 block">
                Private Key
                <span className="text-muted-foreground font-normal ml-1 text-xs">(used for scanning and withdrawals)</span>
              </Label>
              <Input id="metaPriv" value={metaPriv} onChange={e => setMetaPriv(e.target.value)}
                placeholder="Hex private key" className="font-mono text-sm" type="password" />
            </div>
            <Button onClick={scanPayments} disabled={!metaPriv.trim() || loading} className="w-full cursor-pointer hover:bg-foreground! hover:text-background!">
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scanning…</>
                : <><ScanLine className="mr-2 h-4 w-4" />Scan for My Payments</>}
            </Button>
          </div>
        </Card>

        {/* Your keys */}
        {generatedKeys && (
          <Card className="p-5 mb-6 bg-primary/5 border-primary/20">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold">
                    {generatedKeys.metaPriv ? "Keys registered on-chain" : "Your registered keys"}
                  </p>
                  {(generatedKeys.onChain || generatedKeys.txHash) && (
                    <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded font-medium">
                      On-chain ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {generatedKeys.metaPriv
                    ? "Save your private key now — it is never stored on any server."
                    : "Public meta-address loaded from registry. Private key only shown once at generation."}
                </p>
                {generatedKeys.txHash && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${generatedKeys.txHash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary/80 hover:text-primary mt-1 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on-chain proof
                  </a>
                )}
              </div>
              {generatedKeys.metaPriv && (
                <button onClick={() => setShowPriv(v => !v)} className="text-muted-foreground hover:text-primary transition-colors ml-3 flex-shrink-0 cursor-pointer">
                  {showPriv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {/* Meta-address (public) */}
              <div className="p-2.5 rounded-md bg-muted/50 border border-primary/30">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-primary">
                    Meta-address <span className="font-normal opacity-70">(share with senders)</span>
                  </span>
                  <button onClick={() => copy(generatedKeys.metaAddress, "meta")} className="text-muted-foreground hover:text-primary cursor-pointer">
                    {copied === "meta" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <p className="font-mono text-xs break-all">{generatedKeys.metaAddress}</p>
              </div>

              {/* Private key — only shown in the session it was generated */}
              {generatedKeys.metaPriv ? (
                showPriv ? (
                  <div className="p-2.5 rounded-md bg-muted/50 border border-amber-500/30">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-amber-400">
                        Private Key <span className="font-normal opacity-70">(secret — keep safe)</span>
                      </span>
                      <button onClick={() => copy(generatedKeys.metaPriv!, "priv")} className="text-muted-foreground hover:text-primary cursor-pointer">
                        {copied === "priv" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                    <p className="font-mono text-xs break-all">{generatedKeys.metaPriv}</p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-md bg-muted/50 border border-amber-500/20 flex items-center justify-between">
                    <span className="text-xs text-amber-400">Private Key hidden — click eye icon to reveal</span>
                    <Eye className="h-3.5 w-3.5 text-amber-400/60" />
                  </div>
                )
              ) : (
                <div className="p-2.5 rounded-md bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
                  Private key not stored anywhere — only shown once when you first generated your keys. You must have saved it then.
                </div>
              )}
            </div>
          </Card>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
        )}

        {/* Scan results */}
        {results !== null && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold font-heading">Payments Found</h2>
              <Badge variant={results.length > 0 ? "default" : "outline"}>{results.length}</Badge>
            </div>

            {results.length === 0 ? (
              <Card className="p-8 text-center bg-card border-border">
                <ScanLine className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No payments found for this key.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {results.map(ann => (
                  <Card key={ann.id} className="p-5 bg-card border-border">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">#{ann.id}</Badge>
                          {ann.balance && ann.balance !== "0.0000000" && (
                            <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                              {parseFloat(ann.balance).toFixed(2)} XLM
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-xs text-muted-foreground break-all">
                          <span className="text-foreground font-medium">Stealth: </span>{ann.stellarAddress}
                        </p>
                      </div>
                      <a href={`https://stellar.expert/explorer/testnet/account/${ann.stellarAddress}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary ml-2 flex-shrink-0">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>

                    {ann.stellarSecret && (
                      <div className="mb-4 p-3 rounded-md bg-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-primary">Stellar Proof Key</span>
                          <button onClick={() => copy(ann.stellarSecret!, `pk-${ann.id}`)}
                            className="text-muted-foreground hover:text-primary transition-colors">
                            {copied === `pk-${ann.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <p className="font-mono text-xs break-all text-foreground">{ann.stellarSecret}</p>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Use this on the <strong className="text-foreground">Prove</strong> page to generate a ZK proof
                          and receive the funds in your wallet.
                        </p>
                      </div>
                    )}

                    <Button className="w-full cursor-pointer hover:bg-foreground! hover:text-background!" onClick={() => goToProve(ann)} disabled={!ann.stellarSecret}>
                      Generate ZK Proof &amp; Claim to Wallet
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
