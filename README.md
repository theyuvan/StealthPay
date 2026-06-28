# ZK Stellar — Private Payments on Stellar

> **DoraHacks Hackathon 2025 Submission**
>
> *The first stealth-address + zero-knowledge proof payment system on Stellar. Every payment lands at a fresh one-time address, and ownership is proved without revealing any key or identity.*

---

## What is ZK Stellar?

ZK Stellar brings **financial privacy to Stellar** without breaking compliance. On a public blockchain, every payment is permanently linked to your wallet address — anyone can reconstruct your full payment history from a single address lookup. ZK Stellar fixes this with two primitives working together:

```
REGISTER  →  Generate a keypair (metaAddress + metaPriv).
             Link metaAddress to your Stellar wallet on-chain via manageData.

SEND      →  Sender derives a one-time stealth address from your public metaAddress
             using ECDH. Funds land there — nothing links you to the payment.

SCAN      →  Recipient runs their metaPriv over all public announcements locally.
             Matching addresses are theirs — no server sees the private key.

PROVE     →  Generate a Groth16 ZK proof in-browser. Prove ownership without
             revealing any private key to anyone.

CLAIM     →  Funds transferred from stealth account to real wallet via accountMerge.
             Stealth account permanently closed.
```

No mixers. No bridges. No custodians. Pure cryptography on Stellar Testnet.

---

## Table of Contents

1. [The Privacy Problem](#1-the-privacy-problem)
2. [How It Works](#2-how-it-works)
3. [Cryptographic Design](#3-cryptographic-design)
4. [ZK Circuit](#4-zk-circuit)
5. [Soroban Smart Contracts](#5-soroban-smart-contracts)
6. [Architecture](#6-architecture)
7. [Full Flow Sequence](#7-full-flow-sequence)
8. [Backend API Reference](#8-backend-api-reference)
9. [Tech Stack](#9-tech-stack)
10. [Repository Structure](#10-repository-structure)
11. [Local Development](#11-local-development)
12. [Pages & Features](#12-pages--features)
13. [Security Model](#13-security-model)
14. [Links](#14-links)

---

## 1. The Privacy Problem

On Stellar — and every other public blockchain — your wallet address is a permanent surveillance record:

| Problem | Reality |
|---|---|
| **Address is public** | Every payment sent or received is permanently linked to your wallet |
| **Analytics exist** | Any tool can reconstruct your full financial history from a single address |
| **No opt-out** | You cannot hide on a public ledger without a dedicated privacy primitive |
| **Real-world risk** | For remittance workers, humanitarian aid recipients, and activists, a visible wallet is a physical safety threat |

ZK Stellar's answer:

- **Stealth addresses** decouple sender ↔ recipient at the cryptographic level — each payment lands at a fresh address that cannot be linked to the recipient's real wallet without their private key.
- **ZK proofs** let the recipient prove ownership to anyone who needs it — a compliance officer, an auditor, a grant committee — without burning their privacy to the whole world.

---

## 2. How It Works

### Recipient setup — one time

1. Go to `/receive` → click **Generate & Register On-chain**
2. Your wallet signs a `manageData` transaction that stores `SHA256(metaAddress)` on your Stellar account — a permanent on-chain proof-of-identity anchor
3. You receive two things:
   - `metaAddress` — your public identity. Share this freely, like an email address.
   - `metaPriv` — your private key. **Shown once. Never stored anywhere.** Write it down.

### Sender — every payment

1. Go to `/send` → paste the recipient's `metaAddress`
2. Backend derives a fresh one-time stealth address using ECDH — the sender never learns the recipient's real wallet
3. Your xBull wallet signs the XLM payment to that stealth address
4. An announcement (the ECDH hint) is posted publicly — no identity, just math

### Recipient — scanning

1. Go to `/receive` → enter your `metaPriv` → click **Scan for My Payments**
2. Your key runs over every public announcement locally — nothing is sent to any server
3. Matching addresses appear with their XLM balances

### Claiming

1. Click **Generate ZK Proof & Claim to Wallet**
2. A Groth16 proof is generated in-browser via snarkjs — proves ownership without revealing `metaPriv`
3. Your wallet signs a claim-authorization transaction
4. Funds are transferred from the stealth account to your real wallet via `accountMerge`
5. The stealth account is permanently closed

---

## 3. Cryptographic Design

### Key System — Single Keypair

ZK Stellar uses **one keypair** per user. No separate scan/spend key split.

| Key | Type | Purpose |
|---|---|---|
| `metaAddress` | secp256k1 compressed public key (33 bytes, hex) | Share publicly. Senders use this to derive stealth addresses. |
| `metaPriv` | secp256k1 private key (32 bytes, hex) | Keep secret. Used for scanning and claiming. Never stored on any server. |

### Stealth Address Derivation (Sender Side)

```
r       = random scalar (ephemeral private key — discarded after use)
R       = r · G                          (ephemeral public key — published as announcement hint)
S       = r · metaAddress               (shared secret via ECDH — only recipient can compute this)
h       = Poseidon(Sx, Sy)              (ZK-friendly hash of shared secret)
P_spend = metaAddress + h · G           (one-time stealth public key)
```

The sender publishes `(P_spend, R)` as an announcement. The relationship between `P_spend` and the recipient's real wallet is mathematically hidden — the sender cannot trace the recipient either.

### Stealth Address Recognition (Recipient Side)

```
S′      = metaPriv · R                  (same shared secret: metaPriv·r·G = r·metaPriv·G = S)
h′      = Poseidon(S′x, S′y)
P′      = metaAddress + h′ · G
```

If `P′ == P_spend` in the announcement → this payment belongs to the recipient.

### Spend Key Derivation (Claim)

```
stealthPriv = metaPriv + h  (mod curve order)
```

This private key controls the stealth Stellar account. It is derived into a Stellar Ed25519 keypair via `SHA256(stealthPriv)` as the seed, then used to sign the `accountMerge` transaction.

### On-Chain Registration

The wallet signs a `manageData` transaction that stores:
```
key:   "zkstellar_meta"
value: SHA256(metaAddress)   // 32 bytes — fits manageData's 64-byte limit
```

This binds a meta-address to a real Stellar wallet without revealing the meta-address itself on-chain. The hash prevents address enumeration while still allowing proof-of-ownership.

---

## 4. ZK Circuit

**File:** `circuits/src/stealth_ownership.circom`

```circom
pragma circom 2.1.6;
include "circomlib/circuits/poseidon.circom";

template StealthOwnership() {
    // Private inputs — never leave the prover's device
    signal input scanPriv;       // metaPriv (both scan and spend in single-key scheme)
    signal input spendPriv;      // metaPriv (same key)

    // Public inputs — go on-chain with the proof
    signal input metaCommitment; // Poseidon(scanPriv, spendPriv) — identity anchor
    signal input nullifier;      // Poseidon(scanPriv, context) — anti-replay token
    signal input context;        // supplied by verifier (e.g. "01")

    // Constraint 1: prover knows the private key behind the meta-address
    component metaHash = Poseidon(2);
    metaHash.inputs[0] <== scanPriv;
    metaHash.inputs[1] <== spendPriv;
    metaHash.out === metaCommitment;

    // Constraint 2: nullifier was honestly derived from the same key + context
    component nullHash = Poseidon(2);
    nullHash.inputs[0] <== scanPriv;
    nullHash.inputs[1] <== context;
    nullHash.out === nullifier;
}

component main {public [metaCommitment, nullifier, context]} = StealthOwnership();
```

### What the ZK Proof Reveals

| Output | What it is | What it proves |
|---|---|---|
| `metaCommitment` | `Poseidon(metaPriv, metaPriv)` | The prover controls the meta-address — without revealing the key |
| `nullifier` | `Poseidon(metaPriv, context)` | This exact proof can only be submitted once — prevents replay attacks |
| `context` | Public verifier-supplied string | Binds the proof to a specific claim context |

The private inputs (`metaPriv`) are never transmitted to any server during proof generation — snarkjs runs entirely in the browser via WebAssembly.

### Proof System

| Property | Value |
|---|---|
| Circuit language | Circom 2.1.6 |
| Proof system | Groth16 |
| Hash function | Poseidon (ZK-friendly, efficient in circuits) |
| Proving library | snarkjs 0.7.6 |
| Proving environment | In-browser (WASM) |
| Trusted setup | Powers of Tau (`ptau` file) |

---

## 5. Soroban Smart Contracts

Two Rust contracts deployed on Stellar Soroban (Testnet):

### `stealth_registry` — Announcement Registry

Stores stealth payment announcements on-chain. Sender authentication is required (`sender.require_auth()`).

```rust
// Announcement stored per payment
pub struct Announcement {
    pub id: u32,
    pub stealth_address: Bytes,
    pub ephemeral_r: Bytes,
    pub sender: Address,
    pub timestamp: u64,
}

pub fn announce(env: Env, sender: Address, stealth_address: Bytes, ephemeral_r: Bytes) -> u32
pub fn get(env: Env, id: u32) -> Announcement
pub fn count(env: Env) -> u32
pub fn list(env: Env, from: u32, limit: u32) -> Vec<Announcement>
```

Emits a Soroban event `("announce", (id, stealth_address, ephemeral_r))` on each post — compatible with Horizon event streaming and off-chain indexers.

### `zk_verifier` — Nullifier Store

Stores verified proof records on-chain. The nullifier is used as the storage key — a duplicate nullifier is rejected, guaranteeing each proof can only be used once.

```rust
pub struct ProofRecord {
    pub meta_commitment: BytesN<32>,
    pub nullifier: BytesN<32>,
    pub context: BytesN<32>,
    pub proof_hash: BytesN<32>,  // SHA256 of the Groth16 proof bytes
    pub submitter: Address,
    pub timestamp: u64,
}

pub fn register_proof(env: Env, submitter: Address, meta_commitment: BytesN<32>,
                      nullifier: BytesN<32>, context: BytesN<32>, proof_hash: BytesN<32>)
pub fn is_nullifier_used(env: Env, nullifier: BytesN<32>) -> bool
pub fn get_proof(env: Env, nullifier: BytesN<32>) -> Option<ProofRecord>
```

**Replay-protection guarantee:** Once a nullifier is registered, any subsequent attempt to register the same nullifier panics — a proof can never be used twice.

---

## 6. Architecture

```
┌──────────────────────── User / Browser ────────────────────────────────┐
│  Next.js 15 frontend (React 19, TypeScript, Tailwind CSS v4)           │
│                                                                        │
│  @creit.tech/stellar-wallets-kit  — xBull + Freighter wallet connect   │
│  snarkjs (WASM)                   — Groth16 proof generation in-browser│
│  @react-three/fiber + three-globe — 3D globe background                │
│  Shadcn UI + Radix                — Component library                  │
│                                                                        │
│  Pages: / · /send · /receive · /prove · /history                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP (localhost:4000)
                                    ▼
┌──────────────────────── Backend (Express :4000) ────────────────────────┐
│  POST /stealth/derive         — ECDH stealth address derivation         │
│  POST /stealth/scan           — Scan announcements for owned payments   │
│  POST /stealth/build-tx       — Build unsigned Stellar payment XDR      │
│  POST /stealth/submit         — Submit signed XDR to Horizon testnet    │
│  POST /stealth/claim          — accountMerge: stealth → recipient wallet│
│  POST /keys/generate          — Fresh secp256k1 keypair                 │
│  POST /keys/build-register-tx — manageData tx for on-chain registration │
│  POST /zk/prove               — Groth16 proof via snarkjs               │
│  POST /zk/verify              — Off-chain proof verification            │
│  GET  /announcements          — Paginated announcement list             │
│  POST /announcements          — Post new stealth payment announcement   │
│                                                                         │
│  Crypto: @noble/curves (secp256k1) · @noble/hashes · poseidon-lite      │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                     Stellar Horizon Testnet (horizon-testnet.stellar.org)
                                    │
                                    ▼
┌──────────────────────── Stellar Testnet ──────────────────────────────┐
│  stealth_registry.rs  — On-chain announcement store (Soroban)         │
│  zk_verifier.rs       — Nullifier registry + proof records (Soroban)  │
│  Stellar Horizon      — Payment submission, account queries           │
│  manageData ops       — Wallet ↔ meta-address binding                 │
│  accountMerge ops     — Full XLM transfer + stealth account close     │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 7. Full Flow Sequence

### Registration

```
Recipient               Frontend                Backend                Stellar Testnet
    │                       │                       │                       │
    │── Connect xBull ─────▶│                       │                       │
    │                       │── POST /keys/generate▶│                       │
    │                       │◀── { metaAddress,      │                       │
    │                       │     metaPriv }         │                       │
    │                       │                       │                       │
    │                       │── POST /keys/          │                       │
    │                       │   build-register-tx ──▶│                       │
    │                       │◀── { xdr: manageData(SHA256(metaAddress)) }    │
    │                       │                       │                       │
    │◀── Sign tx in wallet ─│                       │                       │
    │── signed XDR ────────▶│                       │                       │
    │                       │── POST /stealth/submit▶│── submit to Horizon ▶│
    │                       │                       │◀── { hash: txHash }   │
    │                       │── POST /keys/          │                       │
    │                       │   finalize-registration▶                      │
    │◀── Show metaAddress + metaPriv (once, never stored)                   │
```

### Send Payment

```
Sender                  Frontend                Backend                Stellar Testnet
    │                       │                       │                       │
    │── Enter metaAddress ─▶│                       │                       │
    │── Enter amount ───────▶│                       │                       │
    │                       │── POST /stealth/derive▶│                       │
    │                       │                       │ ECDH derivation        │
    │                       │◀── { stealthAddress,  │                       │
    │                       │     ephemeralR,        │                       │
    │                       │     stellarAddress }   │                       │
    │                       │                       │                       │
    │                       │── POST /stealth/       │                       │
    │                       │   build-tx ───────────▶│── loadAccount(sender)▶│
    │                       │◀── { xdr }             │                       │
    │                       │                       │                       │
    │◀── Sign in wallet ────│                       │                       │
    │── signed XDR ────────▶│                       │                       │
    │                       │── POST /stealth/submit▶│── submit to Horizon ▶│
    │                       │── POST /announcements ▶│ (store hint)          │
    │◀── Payment confirmed ─│                       │                       │
```

### Scan & Claim

```
Recipient               Frontend                Backend                Stellar Testnet
    │                       │                       │                       │
    │── Enter metaPriv ────▶│                       │                       │
    │── Click Scan ─────────▶│                       │                       │
    │                       │── POST /stealth/scan ─▶│                       │
    │                       │                       │ derives metaPub        │
    │                       │                       │ ECDH match per entry   │
    │                       │◀── { owned: [...] }   │                       │
    │                       │── GET /stealth/balance▶│── loadAccount ───────▶│
    │◀── Show payments ─────│                       │                       │
    │                       │                       │                       │
    │── Click Claim ────────▶│                       │                       │
    │                       │ (snarkjs WASM generates proof in-browser)      │
    │                       │── POST /zk/prove ─────▶│                       │
    │                       │◀── { proof, nullifier, metaCommitment }        │
    │                       │                       │                       │
    │                       │── POST /stealth/       │                       │
    │                       │   build-claim-auth-tx ▶│                       │
    │◀── Sign auth tx ──────│                       │                       │
    │                       │── POST /stealth/submit▶│── submit to Horizon ▶│
    │                       │── POST /stealth/claim ▶│── accountMerge ──────▶│
    │                       │                       │   stealth → recipient  │
    │◀── Funds arrived ─────│                       │   stealth account closed│
```

---

## 8. Backend API Reference

Base URL: `http://localhost:4000`

### Stealth

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| `POST` | `/stealth/derive` | `{ metaAddress }` | `{ stealthPub, ephemeralR, stellarAddress }` |
| `POST` | `/stealth/scan` | `{ metaPriv }` | `{ total, owned, announcements }` |
| `POST` | `/stealth/spend-key` | `{ metaPriv, ephemeralR }` | `{ stealthPriv, stellarAddress, stellarSecret }` |
| `POST` | `/stealth/build-tx` | `{ fromAddress, toAddress, amount }` | `{ xdr, networkPassphrase }` |
| `POST` | `/stealth/submit` | `{ signedXdr }` | `{ hash, success }` |
| `POST` | `/stealth/fund` | `{ stellarAddress }` | `{ funded, balance }` |
| `GET` | `/stealth/balance/:address` | — | `{ address, balance }` |
| `POST` | `/stealth/build-claim-auth-tx` | `{ recipientAddress, nullifier }` | `{ xdr, networkPassphrase }` |
| `POST` | `/stealth/claim` | `{ stellarProofKey, recipientAddress, proof, publicSignals }` | `{ hash, amount }` |

### Keys

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| `POST` | `/keys/generate` | — | `{ metaPriv, metaPub, metaAddress }` |
| `POST` | `/keys/register` | `{ walletAddress, metaAddress }` | `{ ok, metaAddress }` |
| `POST` | `/keys/build-register-tx` | `{ walletAddress, metaAddress }` | `{ xdr, networkPassphrase }` |
| `POST` | `/keys/finalize-registration` | `{ walletAddress, metaAddress, txHash }` | `{ ok, metaAddress, txHash }` |
| `GET` | `/keys/meta/:walletAddress` | — | `{ exists, metaAddress, txHash, onChain }` |

### ZK Proof

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| `POST` | `/zk/prove` | `{ metaPriv, context? }` | `{ proof, publicSignals, metaCommitment, nullifier }` |
| `POST` | `/zk/verify` | `{ proof, publicSignals }` | `{ valid: boolean }` |

### Announcements

| Method | Endpoint | Query / Body | Returns |
|---|---|---|---|
| `GET` | `/announcements` | `?from=0&count=20&sort=desc` | `{ total, announcements }` |
| `POST` | `/announcements` | `{ stealthAddress, ephemeralR, stellarAddress, metadata }` | `{ ok, entry }` |
| `GET` | `/health` | — | `{ ok: true }` |

---

## 9. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 |
| **UI components** | Shadcn UI · Radix UI · Lucide React |
| **3D background** | Three.js · @react-three/fiber · @react-three/drei · three-globe |
| **Wallet** | `@creit.tech/stellar-wallets-kit` — xBull + Freighter |
| **Stellar SDK** | `@stellar/stellar-sdk` v16 (frontend + backend) |
| **Backend** | Node.js · Express · CORS |
| **Elliptic curves** | `@noble/curves` — secp256k1 ECDH, key generation |
| **Hashing** | `@noble/hashes` — SHA-256 |
| **ZK circuits** | Circom 2.1.6 · circomlib (Poseidon) |
| **ZK proving** | snarkjs 0.7.6 — Groth16 prove + verify |
| **ZK hashing** | `poseidon-lite` — Poseidon hash outside circuit |
| **Smart contracts** | Rust · Soroban SDK |
| **Blockchain** | Stellar Testnet — Horizon API |

---

## 10. Repository Structure

```
stellar/
├── README.md
│
├── backend/
│   ├── index.js                    # Express API — all routes
│   ├── package.json
│   └── data/                       # gitignored — auto-created at runtime
│       ├── announcements.json      # stealth payment announcement store
│       └── meta_map.json           # wallet → meta-address registry
│
├── circuits/
│   ├── src/
│   │   └── stealth_ownership.circom  # Groth16 circuit: metaCommitment + nullifier
│   ├── build/
│   │   ├── stealth_ownership.r1cs    # compiled constraints
│   │   ├── stealth_ownership.wasm    # WASM witness generator
│   │   ├── stealth_ownership.zkey    # proving key (Groth16)
│   │   ├── verification_key.json     # verifier key
│   │   └── stealth_ownership_js/     # witness calculator
│   ├── scripts/
│   │   └── generate_proof.js         # snarkjs prove + verify wrapper
│   └── package.json
│
├── contracts/
│   ├── stealth_registry/
│   │   └── src/lib.rs              # Soroban: on-chain announcement store
│   ├── zk_verifier/
│   │   └── src/lib.rs              # Soroban: nullifier store + proof records
│   └── stealth_pool/
│       └── src/lib.rs              # Soroban: pooled fund escrow
│
└── frontend/
    ├── app/
    │   ├── page.tsx                # Landing page (3D globe + sections)
    │   ├── send/page.tsx           # Send a private payment
    │   ├── receive/page.tsx        # Register keys + scan for payments
    │   ├── prove/page.tsx          # Generate ZK proof + claim funds
    │   └── history/page.tsx        # Public announcement history
    ├── components/
    │   ├── navbar.tsx
    │   ├── hero-section.tsx
    │   ├── about-section.tsx       # Privacy problem + solution
    │   ├── three-tier-section.tsx  # "How it works" steps
    │   ├── skills-section.tsx      # Tech stack bento grid
    │   ├── cta-section.tsx         # Action cards
    │   ├── footer.tsx
    │   ├── zk-scene.tsx            # Three.js globe (R3F)
    │   └── ui/                     # Shadcn components
    ├── hooks/
    │   ├── wallet-context.tsx      # xBull/Freighter wallet state
    │   └── use-wallet.ts
    ├── data/
    │   ├── portfolio-data.ts       # Stat copy
    │   └── globe.json              # Country GeoJSON for globe
    ├── lib/utils.ts
    └── package.json
```

---

## 11. Local Development

### Prerequisites

- **Node.js** 20+
- **Rust + Cargo** (for Soroban contracts) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Stellar CLI** — `cargo install --locked stellar-cli`
- **xBull wallet** browser extension — set to **Testnet** mode

### 1. Clone & install

```bash
git clone https://github.com/theyuvan/stellar.git
cd stellar

cd backend && npm install && cd ..
cd circuits && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Rebuild the ZK circuit (optional — build artifacts are committed)

```bash
cd circuits

# Compile
circom src/stealth_ownership.circom --r1cs --wasm --sym -o build/

# Trusted setup
snarkjs powersoftau new bn128 12 pot12_0000.ptau
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First"
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau

# Generate proving key
snarkjs groth16 setup build/stealth_ownership.r1cs pot12_final.ptau build/stealth_ownership_0000.zkey
snarkjs zkey contribute build/stealth_ownership_0000.zkey build/stealth_ownership.zkey --name="ZK Stellar"
snarkjs zkey export verificationkey build/stealth_ownership.zkey build/verification_key.json
```

### 3. Start the backend

```bash
cd backend
node index.js
# → Listening on http://localhost:4000
```

### 4. Start the frontend

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

### 5. End-to-end test

**Register and send:**
1. Open `localhost:3000` → connect xBull (Testnet)
2. Go to `/receive` → click **Generate & Register On-chain** → sign the wallet transaction
3. Copy your `metaAddress`. Save your `metaPriv` somewhere safe.
4. Go to `/send` → paste the `metaAddress` → enter an amount → **Derive Stealth Address** → **Send XLM** → sign in xBull

**Scan and claim:**
1. Go back to `/receive` → enter `metaPriv` → **Scan for My Payments**
2. Your payment appears with the XLM balance
3. Click **Generate ZK Proof & Claim to Wallet** → wait ~10–30 seconds for proof
4. Sign the claim-authorization transaction in xBull
5. Funds arrive in your connected wallet

---

## 12. Pages & Features

| Page | Route | Description |
|---|---|---|
| **Landing** | `/` | 3D globe, project overview, how-it-works, tech stack bento grid |
| **Send** | `/send` | Enter recipient meta-address + amount → derive stealth address → sign + submit |
| **Receive** | `/receive` | Generate keypair + on-chain registration → scan announcements → view owned payments |
| **Prove** | `/prove` | Enter proof key + metaPriv → generate Groth16 proof → claim funds via accountMerge |
| **History** | `/history` | Public announcement list — all stealth hints, no identities, newest-first |

### Key UX Details

- **Single keypair** — Users see only `metaAddress` (public, share it) + `metaPriv` (private, save it). No scan/spend split.
- **Private key never stored** — `metaPriv` is shown once on first generation, immediately cleared from state, never written to localStorage or sent to any server.
- **Claimed payments hidden** — `/receive` scan filters out stealth accounts with zero XLM balance (already claimed).
- **History newest-first** — Reverse pagination: page 0 always shows the most recent announcements using a 2-step fetch (get total → compute offset from end).

---

## 13. Security Model

| Claim | How it holds |
|---|---|
| **Private key never stored** | `metaPriv` is shown once, then React state is cleared. Never written to `localStorage`, `sessionStorage`, or any persistent store. |
| **Scanning is local** | `POST /stealth/scan` receives `metaPriv` transiently to derive `metaPub` and run the ECDH check — it is never logged or persisted by the backend. |
| **No wallet ↔ identity linkage in browser** | Only the public wallet address is stored in React context. No mapping of wallet → metaAddress is kept client-side. |
| **One-time stealth addresses** | Each payment uses a fresh ephemeral scalar `r`. No two payments to the same recipient share an address. Chain-level unlinkability is preserved. |
| **Replay protection** | Poseidon nullifiers prevent the same proof from being reused. The nullifier is permanently stored on the `zk_verifier` Soroban contract after first use. |
| **Compliant privacy** | Not anonymous mixing. Recipients can selectively disclose their `metaAddress` to prove they received a payment, and can generate ZK proofs for compliance review — without exposing their full payment history. |

---

## 14. Links

| Resource | URL |
|---|---|
| Stellar Horizon Testnet | https://horizon-testnet.stellar.org |
| Stellar Expert (Testnet Explorer) | https://stellar.expert/explorer/testnet |
| Stellar Testnet Friendbot | https://friendbot.stellar.org |
| Soroban Docs | https://developers.stellar.org/docs/smart-contracts |
| Stellar JS SDK | https://stellar.github.io/js-stellar-sdk |
| snarkjs | https://github.com/iden3/snarkjs |
| circomlib (Poseidon) | https://github.com/iden3/circomlib |

---

## Acknowledgements

- [Stellar Development Foundation](https://stellar.org) — Stellar blockchain, Soroban smart contracts, Horizon API
- [iden3](https://iden3.io) — Circom, snarkjs, circomlib (Poseidon)
- [Paul Miller](https://paulmillr.com) — @noble/curves (secp256k1), @noble/hashes
- [Shadcn](https://ui.shadcn.com) — UI component library
- [vasturiano/three-globe](https://github.com/vasturiano/three-globe) — 3D globe visualization

---

## License

MIT

---

*Built for the DoraHacks Hackathon 2025 · Running on Stellar Testnet · Privacy-preserving payments without compromise*
