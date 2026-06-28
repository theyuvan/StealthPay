import { Shield, Zap, Code, Lock, Globe, Eye } from "lucide-react"

export const skills = [
  {
    icon: Shield,
    label: "Stealth Addresses",
    description: "EC math over secp256k1 — every payment lands at a fresh one-time address",
  },
  {
    icon: Code,
    label: "Groth16 ZK Proofs",
    description: "Circom 2 + SnarkJS: prove ownership without revealing keys or addresses",
  },
  {
    icon: Globe,
    label: "Stellar / Soroban",
    description: "Smart contracts in Rust on Stellar Testnet — announcement registry + nullifier store",
  },
  {
    icon: Lock,
    label: "Poseidon Hash",
    description: "ZK-friendly hash for nullifiers and meta-address commitments inside the circuit",
  },
  {
    icon: Eye,
    label: "Selective Disclosure",
    description: "View keys + ZK proofs let recipients prove eligibility without exposing addresses",
  },
  {
    icon: Zap,
    label: "Off-chain Scan",
    description: "Recipient scans announcements locally — private keys never leave the browser",
  },
]

export const achievements = [
  { number: "1", label: "Key to remember" },
  { number: "ZK", label: "Proof of ownership" },
  { number: "∞", label: "Payment privacy" },
]

export const careerTimeline = [
  {
    id: "1",
    title: "Crypto Primitives",
    date: "Phase 1",
    description: "secp256k1 stealth derivation, scan logic, and spend-key recovery in TypeScript",
    status: "completed" as const,
  },
  {
    id: "2",
    title: "Soroban Contracts",
    date: "Phase 2",
    description: "stealth_registry (announcements) and zk_verifier (nullifier store) in Rust",
    status: "completed" as const,
  },
  {
    id: "3",
    title: "ZK Circuit",
    date: "Phase 3",
    description: "Circom 2 circuit: Poseidon nullifier + meta-commitment; compiled to WASM + zkey",
    status: "completed" as const,
  },
  {
    id: "4",
    title: "Backend API",
    date: "Phase 4",
    description: "Express server wiring crypto, snarkjs proof generation, and announcement store",
    status: "completed" as const,
  },
  {
    id: "5",
    title: "Frontend dApp",
    date: "Phase 5",
    description: "Send / Receive / Prove pages — full privacy-preserving payment flow in the browser",
    status: "current" as const,
  },
  {
    id: "6",
    title: "Testnet Deploy + Demo",
    date: "Phase 6",
    description: "Deploy contracts to Stellar Testnet, integrate Freighter wallet, record demo",
    status: "upcoming" as const,
  },
]
