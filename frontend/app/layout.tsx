import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import { DM_Sans } from "next/font/google"
import { WalletProvider } from "@/hooks/wallet-context"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
})

export const metadata: Metadata = {
  title: "ZK Stellar — Stealth Address + ZK Linkability Proof",
  description:
    "Privacy-preserving payments on Stellar using stealth addresses and zero-knowledge proofs. Every payment lands at a fresh one-time address only the recipient can recognize.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
      <head>
        <style>{`
html {
  font-family: ${dmSans.style.fontFamily};
  --font-heading: ${spaceGrotesk.style.fontFamily};
  --font-body: ${dmSans.style.fontFamily};
}
        `}</style>
      </head>
      <body className="font-body pt-16">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  )
}
