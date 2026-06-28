"use client"
import { useState } from "react"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet } from "@/hooks/wallet-context"
import {
  ArrowRight, Shield, Copy, Check, Loader2,
  Wallet, AlertCircle, ExternalLink
} from "lucide-react"

const API = "http://localhost:4000"
const TESTNET_EXPLORER = "https://stellar.expert/explorer/testnet/tx"

type DeriveResult = {
  stealthPub: string
  ephemeralR: string
  stellarAddress: string
}

type Step = "idle" | "derived" | "announced" | "submitted"

export default function SendPage() {
  const wallet = useWallet()
  const [metaAddress, setMetaAddress] = useState("")
  const [amount, setAmount] = useState("10")
  const [derived, setDerived] = useState<DeriveResult | null>(null)
  const [step, setStep] = useState<Step>("idle")
  const [txHash, setTxHash] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  async function deriveAddress() {
    setError("")
    setDerived(null)
    setStep("idle")
    setLoading(true)
    try {
      const res = await fetch(`${API}/stealth/derive`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metaAddress }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to derive stealth address")
      setDerived(data)
      setStep("derived")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  async function sendPayment() {
    if (!derived || !wallet.publicKey) return
    setError("")
    setLoading(true)
    try {
      // 1. Build unsigned transaction XDR on backend
      const buildRes = await fetch(`${API}/stealth/build-tx`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fromAddress: wallet.publicKey,
          toAddress: derived.stellarAddress,
          amount,
        }),
      })
      const { xdr, networkPassphrase, error: buildErr } = await buildRes.json()
      if (!buildRes.ok) throw new Error(buildErr || "Failed to build transaction")

      // 2. Sign with XBull / Freighter
      const signedXdr = await wallet.signTransaction(xdr, networkPassphrase)

      // 3. Submit signed XDR
      if (!signedXdr) throw new Error("Wallet did not return a signed transaction")
      const submitRes = await fetch(`${API}/stealth/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signedXdr }),
      })
      const submitData = await submitRes.json()
      if (!submitRes.ok) throw new Error(submitData.error || "Transaction failed")

      // 4. Post announcement to registry — only the minimum scanning data.
      // Sender identity and amount are intentionally omitted to protect sender privacy.
      // The txHash is already public on Stellar so it's acceptable to include.
      await fetch(`${API}/announcements`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stealthAddress: derived.stealthPub,
          ephemeralR: derived.ephemeralR,
          stellarAddress: derived.stellarAddress,
          metadata: { txHash: submitData.hash },
        }),
      })

      setTxHash(submitData.hash)
      setStep("submitted")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setDerived(null)
    setStep("idle")
    setTxHash("")
    setMetaAddress("")
    setAmount("10")
    setError("")
  }

  return (
    <div className="min-h-screen bg-background dark">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-20">
        <div className="mb-10">
          <Badge variant="outline" className="mb-3 text-xs">Testnet</Badge>
          <h1 className="text-4xl font-bold font-heading mb-3">Send a Private Payment</h1>
          <p className="text-muted-foreground leading-relaxed">
            Enter the recipient&apos;s meta-address. A fresh one-time Stellar account is derived —
            only the recipient&apos;s scan key can link it back to them.
          </p>
        </div>

        {/* Wallet status */}
        {!wallet.connected ? (
          <div className="mb-6 p-4 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <Wallet className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Wallet not connected</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click <strong>&quot;Connect Wallet&quot;</strong> in the top-right and choose xBull.
                Make sure xBull is set to <strong>Testnet</strong> in its settings.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-3 rounded-md bg-primary/5 border border-primary/20 flex items-center gap-2.5">
            <Wallet className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-sm text-primary font-medium">{wallet.walletName}</span>
            <span className="font-mono text-xs text-muted-foreground ml-auto">
              {wallet.publicKey!.slice(0, 6)}…{wallet.publicKey!.slice(-6)}
            </span>
          </div>
        )}

        {step !== "submitted" && (
          <Card className="p-6 mb-6 bg-card border-border">
            <div className="space-y-4">
              <div>
                <Label htmlFor="meta" className="text-sm font-medium mb-2 block">
                  Recipient meta-address
                  <span className="text-muted-foreground font-normal ml-1 text-xs">(from recipient&apos;s /receive page)</span>
                </Label>
                <Input
                  id="meta"
                  value={metaAddress}
                  onChange={e => { setMetaAddress(e.target.value); setStep("idle"); setDerived(null) }}
                  placeholder="02… or 03… (33-byte compressed public key hex)"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="amount" className="text-sm font-medium mb-2 block">
                  Amount <span className="text-muted-foreground font-normal">(testnet XLM)</span>
                </Label>
                <Input
                  id="amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="10"
                  className="text-sm"
                  type="number"
                  min="1"
                  step="1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 1 XLM (activates the stealth account on testnet).
                </p>
              </div>

              <Button
                onClick={deriveAddress}
                disabled={!metaAddress.trim() || loading}
                className="w-full cursor-pointer hover:bg-foreground! hover:text-background!"
              >
                {loading && step === "idle" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deriving…</>
                ) : (
                  <><Shield className="mr-2 h-4 w-4" />Derive Stealth Address</>
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

        {/* Derived — show addresses + send button */}
        {derived && step === "derived" && (
          <Card className="p-6 mb-6 bg-card border-border">
            <h2 className="text-base font-semibold font-heading mb-1">Stealth Address Ready</h2>
            <p className="text-sm text-muted-foreground mb-5">
              A one-time Stellar account was derived from the recipient&apos;s keys.
              Your XBull wallet will sign the payment to this address.
            </p>

            <div className="space-y-3 mb-6">
              {[
                { label: "Stealth Stellar address (payment destination)", value: derived.stellarAddress, key: "stellar" },
                { label: "Ephemeral R (scanning hint for recipient)", value: derived.ephemeralR, key: "ephem" },
              ].map(({ label, value, key }) => (
                <div key={key} className="p-3 rounded-md bg-muted/50 border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <button onClick={() => copy(value, key)} className="text-muted-foreground hover:text-primary transition-colors">
                      {copied === key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="font-mono text-xs break-all">{value}</p>
                </div>
              ))}
            </div>

            <Button
              onClick={sendPayment}
              disabled={!wallet.connected || loading}
              className="w-full cursor-pointer hover:bg-foreground! hover:text-background!"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing &amp; submitting…</>
              ) : !wallet.connected ? (
                "Connect wallet first"
              ) : (
                <>Send {amount} XLM via {wallet.walletName}<ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </Card>
        )}

        {/* Success */}
        {step === "submitted" && derived && (
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold font-heading mb-1">Payment Sent!</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  <strong className="text-foreground">{amount} XLM</strong> sent to a fresh stealth address on testnet.
                  The recipient scans on <strong className="text-foreground">/receive</strong> to discover it.
                </p>

                <div className="space-y-2 mb-5">
                  {[
                    { label: "Stealth Stellar address", value: derived.stellarAddress },
                    { label: "Ephemeral R", value: derived.ephemeralR },
                    { label: "Sender", value: wallet.publicKey! },
                    { label: "Transaction hash", value: txHash },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-2 rounded-md bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                      <p className="font-mono text-xs break-all">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 flex-wrap">
                  <a
                    href={`${TESTNET_EXPLORER}/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="cursor-pointer hover:bg-foreground! hover:text-background!">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      View on Stellar Expert
                    </Button>
                  </a>
                  <Button variant="ghost" size="sm" onClick={reset} className="cursor-pointer hover:bg-foreground! hover:text-background!">
                    Send another
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {step === "idle" && (
          <div className="mt-8 p-5 rounded-lg border border-border bg-muted/20">
            <h3 className="text-sm font-semibold mb-2">How the recipient gets their meta-address</h3>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Go to <strong className="text-foreground">/receive</strong></li>
              <li>Click <strong className="text-foreground">&quot;Generate fresh keys&quot;</strong></li>
              <li>Copy the <strong className="text-foreground">meta-address</strong> and share it</li>
              <li>Save the <strong className="text-foreground">private key</strong> — it&apos;s never stored on any server</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  )
}
