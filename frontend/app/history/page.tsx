"use client"
import { useState, useEffect, useCallback } from "react"
import Navbar from "@/components/navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useWallet } from "@/hooks/wallet-context"
import {
  Clock, ExternalLink, RefreshCw, Copy, Check,
  Search, ShieldCheck, Loader2, ArrowUpRight, ChevronRight,
  ArrowDownLeft,
} from "lucide-react"

const API = "http://localhost:4000"
const EXPLORER_TX = "https://stellar.expert/explorer/testnet/tx"
const EXPLORER_ACC = "https://stellar.expert/explorer/testnet/account"

type Announcement = {
  id: number
  stealthAddress: string
  ephemeralR: string
  stellarAddress?: string
  timestamp: number
  metadata?: {
    sender?: string
    amount?: string
    txHash?: string
  }
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 0) return `${days}d ago`
  if (hrs > 0) return `${hrs}h ago`
  if (mins > 0) return `${mins}m ago`
  return "just now"
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function shortAddr(addr: string, n = 6) {
  return addr ? `${addr.slice(0, n)}…${addr.slice(-4)}` : "—"
}

export default function HistoryPage() {
  const { publicKey } = useWallet()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const PAGE_SIZE = 10

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const load = useCallback(async (pageNum: number, silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`${API}/announcements?from=${pageNum * PAGE_SIZE}&count=${PAGE_SIZE}`)
      const data = await res.json()
      // newest first so "Latest" stat and top card are always the most recent
      const sorted = (data.announcements || []).slice().sort((a: Announcement, b: Announcement) => b.timestamp - a.timestamp)
      setAnnouncements(sorted)
      setTotal(data.total || 0)
    } catch { /* ignore */ }
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const filtered = search.trim()
    ? announcements.filter(a =>
        a.metadata?.sender?.toLowerCase().includes(search.toLowerCase()) ||
        a.metadata?.txHash?.toLowerCase().includes(search.toLowerCase()) ||
        a.stellarAddress?.toLowerCase().includes(search.toLowerCase()) ||
        a.stealthAddress?.toLowerCase().includes(search.toLowerCase())
      )
    : announcements

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-background dark">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-20">

        {/* Header */}
        <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Badge variant="outline" className="mb-3 text-xs">On-chain registry</Badge>
            <h1 className="text-4xl font-bold font-heading mb-2">Transaction History</h1>
            <p className="text-muted-foreground text-sm">
              All stealth payment announcements — publicly visible scanning hints, no recipient identity revealed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs px-3 py-1.5">
              {total} total
            </Badge>
            <Button variant="outline" size="sm" onClick={() => load(page, true)} disabled={refreshing} className="text-xs gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by sender, tx hash, or stealth address…"
            className="pl-9 bg-card border-border text-sm"
          />
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total payments", value: total.toString() },
            { label: "This page", value: filtered.length.toString() },
            { label: "Latest", value: announcements.length > 0 ? timeAgo(Math.max(...announcements.map(a => a.timestamp))) : "—" },
          ].map(({ label, value }) => (
            <Card key={label} className="p-4 bg-card border-border text-center">
              <p className="text-xl font-bold font-heading text-primary">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </Card>
          ))}
        </div>

        {/* Table / list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center bg-card border-border">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No results match your search." : "No transactions yet. Send a payment to get started."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((ann) => (
              <Card key={ann.id} className="p-4 bg-card border-border hover:border-primary/20 transition-colors group">
                <div className="flex items-start gap-4">
                  {/* Icon / ID */}
                  <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">#{ann.id}</span>
                      {ann.metadata?.amount && (
                        <Badge className="text-xs bg-primary/15 text-primary border-primary/25 px-2">
                          {ann.metadata.amount} XLM
                        </Badge>
                      )}
                      {/* Sent / Received tag */}
                      {publicKey && ann.metadata?.sender === publicKey ? (
                        <Badge className="text-xs bg-orange-500/15 text-orange-400 border-orange-500/25 px-2 gap-1">
                          <ArrowUpRight className="h-2.5 w-2.5" /> Sent
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-green-500/15 text-green-400 border-green-500/25 px-2 gap-1">
                          <ArrowDownLeft className="h-2.5 w-2.5" /> Received
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(ann.timestamp)}
                      </span>
                    </div>
                    {/* Formatted timestamp */}
                    <p className="text-xs text-muted-foreground/60 mb-2">{formatTime(ann.timestamp)}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Stealth address */}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Stealth address</p>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-foreground truncate">
                            {ann.stellarAddress ? shortAddr(ann.stellarAddress, 8) : shortAddr(ann.stealthAddress, 8)}
                          </span>
                          <button
                            onClick={() => copy(ann.stellarAddress || ann.stealthAddress, `addr-${ann.id}`)}
                            className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                          >
                            {copied === `addr-${ann.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                          {ann.stellarAddress && (
                            <a href={`${EXPLORER_ACC}/${ann.stellarAddress}`} target="_blank" rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Sender */}
                      {ann.metadata?.sender && (
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-0.5">Sender</p>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-foreground truncate">
                              {shortAddr(ann.metadata.sender, 8)}
                            </span>
                            <button
                              onClick={() => copy(ann.metadata!.sender!, `sender-${ann.id}`)}
                              className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                            >
                              {copied === `sender-${ann.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tx hash */}
                    {ann.metadata?.txHash && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Tx:</span>
                        <a
                          href={`${EXPLORER_TX}/${ann.metadata.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-mono text-primary/80 hover:text-primary transition-colors"
                        >
                          {shortAddr(ann.metadata.txHash, 10)}
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                        <button
                          onClick={() => copy(ann.metadata!.txHash!, `tx-${ann.id}`)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {copied === `tx-${ann.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!search && totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                const pageNum = totalPages <= 7 ? i : page < 4 ? i : page + i - 3
                if (pageNum >= totalPages) return null
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                      pageNum === page
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-xs gap-1"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Legend */}
        <div className="mt-12 p-5 rounded-lg border border-border bg-muted/10">
          <h3 className="text-sm font-semibold mb-2">Privacy model</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Each entry is a <span className="text-foreground font-medium">stealth announcement</span> — the sender posts the
            ephemeral R value publicly so the recipient can scan. The actual stealth address can be derived by anyone,
            but only the recipient (with their private scan key) can recognize which payment belongs to them.
            No personal identity, no link between sender and recipient is revealed on-chain.
          </p>
        </div>
      </main>
    </div>
  )
}
