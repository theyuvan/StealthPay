"use client"
import { useState, useCallback, useEffect } from "react"

export type WalletState = {
  connected: boolean
  publicKey: string | null
  walletName: string | null
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    walletName: null,
  })

  useEffect(() => {
    const stored = sessionStorage.getItem("wallet")
    if (stored) {
      try { setState(JSON.parse(stored)) } catch {}
    }
  }, [])

  const connectXBull = useCallback(async () => {
    // Use the proper xBullWalletConnect SDK — not the unreliable window.xBullSDK injection
    const { xBullWalletConnect } = await import("@creit.tech/xbull-wallet-connect")
    const bridge = new xBullWalletConnect()
    const publicKey = await bridge.connect({ canRequestPublicKey: true, canRequestSign: true })
    bridge.closeConnections()
    const next = { connected: true, publicKey, walletName: "xBull" }
    setState(next)
    sessionStorage.setItem("wallet", JSON.stringify(next))
    return publicKey
  }, [])

  const connectFreighter = useCallback(async () => {
    const freighter = window as unknown as {
      freighter?: {
        getPublicKey: () => Promise<string>
      }
    }
    if (!freighter.freighter) throw new Error("Freighter not installed")
    const publicKey = await freighter.freighter.getPublicKey()
    const next = { connected: true, publicKey, walletName: "Freighter" }
    setState(next)
    sessionStorage.setItem("wallet", JSON.stringify(next))
    return publicKey
  }, [])

  const disconnect = useCallback(() => {
    sessionStorage.removeItem("wallet")
    setState({ connected: false, publicKey: null, walletName: null })
  }, [])

  const signTransaction = useCallback(async (xdr: string, networkPassphrase: string): Promise<string> => {
    if (state.walletName === "xBull") {
      const { xBullWalletConnect } = await import("@creit.tech/xbull-wallet-connect")
      const bridge = new xBullWalletConnect()
      // bridge.sign() returns the signed XDR string directly
      const signedXdr = await bridge.sign({
        xdr,
        publicKey: state.publicKey ?? undefined,
        network: networkPassphrase,
      })
      bridge.closeConnections()
      return signedXdr
    }
    if (state.walletName === "Freighter") {
      const freighter = window as unknown as {
        freighter?: {
          signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>
        }
      }
      if (!freighter.freighter) throw new Error("Freighter not available")
      return freighter.freighter.signTransaction(xdr, { networkPassphrase })
    }
    throw new Error("No wallet connected")
  }, [state.walletName, state.publicKey])

  return { ...state, connectXBull, connectFreighter, disconnect, signTransaction }
}
