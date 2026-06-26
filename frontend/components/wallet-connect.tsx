"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/wallet-context"
import { Wallet, ChevronDown, LogOut, ExternalLink } from "lucide-react"

export default function WalletConnect() {
  const { connected, publicKey, walletName, connectXBull, connectFreighter, disconnect } = useWallet()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState<string | null>(null)

  async function handleConnect(type: "xbull" | "freighter") {
    setError("")
    setLoading(type)
    try {
      if (type === "xbull") await connectXBull()
      else await connectFreighter()
      setOpen(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed")
    } finally {
      setLoading(null)
    }
  }

  if (connected && publicKey) {
    const short = `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`
    return (
      <div className="relative shrink-0">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 border border-primary/60 rounded-lg px-3.5 py-2 transition-all shadow-[0_0_12px_rgba(255,200,0,0.15)] hover:shadow-[0_0_18px_rgba(255,200,0,0.25)]"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground/70 animate-pulse" />
          <Wallet className="h-3.5 w-3.5" />
          {short}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-border bg-popover shadow-2xl p-4">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Connected via {walletName}</p>
                  <p className="text-xs text-muted-foreground">Testnet</p>
                </div>
                <div className="ml-auto h-2 w-2 rounded-full bg-emerald-400" />
              </div>
              <p className="font-mono text-xs break-all text-foreground mb-4 bg-muted/40 rounded-md p-2">{publicKey}</p>
              <button
                onClick={() => { disconnect(); setOpen(false) }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors w-full"
              >
                <LogOut className="h-3.5 w-3.5" />
                Disconnect wallet
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 transition-all shadow-[0_0_16px_rgba(255,200,0,0.2)] hover:shadow-[0_0_24px_rgba(255,200,0,0.35)]"
      >
        <Wallet className="h-3.5 w-3.5" />
        Connect Wallet
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-border bg-popover shadow-2xl p-4">
            <p className="text-xs font-semibold text-foreground mb-1">Connect a Stellar wallet</p>
            <p className="text-xs text-muted-foreground mb-4">Make sure you&apos;re on <span className="text-primary font-medium">Testnet</span></p>
            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-1.5">
                <span className="flex-1">{error}</span>
                {error.includes("not installed") && (
                  <a href="https://xbull.app" target="_blank" rel="noopener noreferrer" className="flex-shrink-0 mt-0.5">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={() => handleConnect("xbull")}
                disabled={!!loading}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-sm disabled:opacity-50 group"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20">
                  <span className="text-primary font-bold text-sm">x</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold leading-none">xBull</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {loading === "xbull" ? "Connecting…" : "Stellar wallet extension"}
                  </p>
                </div>
                {loading === "xbull" && <div className="ml-auto h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              </button>
              <button
                onClick={() => handleConnect("freighter")}
                disabled={!!loading}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-blue-400/40 hover:bg-blue-500/5 transition-all text-sm disabled:opacity-50 group"
              >
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/15">
                  <span className="text-blue-400 font-bold">F</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold leading-none">Freighter</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {loading === "freighter" ? "Connecting…" : "By Stellar Development Foundation"}
                  </p>
                </div>
                {loading === "freighter" && <div className="ml-auto h-3.5 w-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
