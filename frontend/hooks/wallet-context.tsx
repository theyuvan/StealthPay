"use client"
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

type WalletState = {
  connected: boolean
  publicKey: string | null
  walletName: string | null
}

type WalletContext = WalletState & {
  connectXBull: () => Promise<string>
  connectFreighter: () => Promise<string>
  disconnect: () => void
  signTransaction: (xdr: string, networkPassphrase: string) => Promise<string>
}

const Ctx = createContext<WalletContext | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    walletName: null,
  })

  useEffect(() => {
    const stored = localStorage.getItem("wallet")
    if (stored) {
      try { setState(JSON.parse(stored)) } catch {}
    }
  }, [])

  const save = (next: WalletState) => {
    setState(next)
    localStorage.setItem("wallet", JSON.stringify(next))
  }

  const connectXBull = useCallback(async () => {
    const { xBullWalletConnect } = await import("@creit.tech/xbull-wallet-connect")
    const bridge = new xBullWalletConnect()
    const publicKey = await bridge.connect({ canRequestPublicKey: true, canRequestSign: true })
    bridge.closeConnections()
    save({ connected: true, publicKey, walletName: "xBull" })
    return publicKey
  }, [])

  const connectFreighter = useCallback(async () => {
    const win = window as unknown as { freighter?: { getPublicKey: () => Promise<string> } }
    if (!win.freighter) throw new Error("Freighter not installed")
    const publicKey = await win.freighter.getPublicKey()
    save({ connected: true, publicKey, walletName: "Freighter" })
    return publicKey
  }, [])

  const disconnect = useCallback(() => {
    localStorage.removeItem("wallet")
    setState({ connected: false, publicKey: null, walletName: null })
  }, [])

  const signTransaction = useCallback(async (xdr: string, networkPassphrase: string): Promise<string> => {
    if (state.walletName === "xBull") {
      const { xBullWalletConnect } = await import("@creit.tech/xbull-wallet-connect")
      const bridge = new xBullWalletConnect()
      const signedXdr = await bridge.sign({
        xdr,
        publicKey: state.publicKey ?? undefined,
        network: networkPassphrase,
      })
      bridge.closeConnections()
      return signedXdr
    }
    if (state.walletName === "Freighter") {
      const win = window as unknown as {
        freighter?: { signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string> }
      }
      if (!win.freighter) throw new Error("Freighter not available")
      return win.freighter.signTransaction(xdr, { networkPassphrase })
    }
    throw new Error("No wallet connected")
  }, [state.walletName, state.publicKey])

  return (
    <Ctx.Provider value={{ ...state, connectXBull, connectFreighter, disconnect, signTransaction }}>
      {children}
    </Ctx.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider")
  return ctx
}
