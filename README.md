# ZK Stellar — Stealth Address + ZK Linkability Proof
## Complete Project Specification for Claude Code

---

## Project Overview

**Hackathon:** ZK Stellar Hackathon (DoraHacks)
**Link:** https://dorahacks.io/hackathon/stellar-hacks-zk
**Core idea:** Privacy-preserving payments on Stellar using stealth addresses and zero-knowledge proofs — solving real-world identity/address traceability risks (kidnapping, extortion, surveillance) for remittance and humanitarian aid use cases.

**Two-sentence pitch:**
Instead of a permanent, watchable wallet address, every payment lands at a fresh, one-time address only the recipient can recognize. When they need to prove ownership or eligibility to a trusted party, they do it via a zero-knowledge proof — no addresses, no identity, ever exposed publicly.

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Blockchain | Stellar (Soroban smart contracts) |
| Smart contract language | Rust (Soroban SDK)   |
| ZK proving system | Circom 2 + SnarkJS (Groth16) OR Noir (easier Rust integration) |
| Stealth address crypto | EC math over Stellar's curve (secp256k1 or ed25519) |
| Frontend | React + TypeScript |
| Stellar SDK | stellar-sdk (JS) / stellar-base |
| Wallet integration | Freighter wallet |
| ZK verifier on-chain | Soroban contract (Groth16 verifier) |

---

## Folder Structure

```
zk-stellar-stealth/
│
├── README.md
├── .env.example
├── package.json                        # root (monorepo or just frontend)
│
├── contracts/                          # Soroban smart contracts (Rust)
│   ├── Cargo.toml
│   ├── stealth_registry/               # Contract 1: announcement registry
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs                  # store ephemeral tags + stealth address announcements
│   │
│   ├── zk_verifier/                    # Contract 2: on-chain Groth16 verifier
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs                  # verify ZK proof on-chain
│   │
│   └── tests/
│       ├── test_registry.rs
│       └── test_verifier.rs
│
├── circuits/                           # ZK circuits (Circom or Noir)
│   ├── stealth_ownership.circom        # prove: I own these stealth addresses
│   ├── stealth_ownership.noir          # same, in Noir (alternative)
│   ├── inputs/
│   │   └── example_input.json          # sample private inputs for testing
│   ├── build/                          # compiled artifacts (gitignored)
│   │   ├── stealth_ownership.wasm
│   │   ├── stealth_ownership.zkey
│   │   └── verification_key.json
│   └── scripts/
│       ├── compile.sh                  # circom compile + setup
│       ├── generate_proof.sh
│       └── verify_proof.sh
│
├── crypto/                             # Pure TS/JS crypto primitives
│   ├── stealth.ts                      # core stealth address derivation
│   ├── keys.ts                         # meta-address generation (scan + spend key)
│   ├── scan.ts                         # recipient scanning logic
│   └── tests/
│       └── stealth.test.ts
│
├── frontend/                           # React + TypeScript UI
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── SenderPanel.tsx         # Maria's UI: enter meta-address, send
│       │   ├── ReceiverPanel.tsx       # Rosa's UI: scan + claim stealth payments
│       │   ├── ProofPanel.tsx          # ZK proof generation + submission UI
│       │   └── WalletConnect.tsx       # Freighter wallet connector
│       ├── hooks/
│       │   ├── useStellar.ts           # Stellar SDK wrapper
│       │   ├── useStealth.ts           # stealth crypto hooks
│       │   └── useZKProof.ts           # snarkjs proof generation hook
│       ├── lib/
│       │   ├── stellar.ts              # Soroban contract calls
│       │   ├── snarkjs.ts              # proof generation wrapper
│       │   └── constants.ts            # contract IDs, network config
│       └── pages/
│           ├── Send.tsx
│           ├── Receive.tsx
│           └── Prove.tsx
│
├── scripts/                            # Dev/deploy scripts
│   ├── deploy_contracts.sh
│   ├── fund_testnet.sh
│   └── generate_test_keys.ts
│
└── docs/
    ├── ARCHITECTURE.md
    ├── MATH.md                         # EC math behind stealth derivation
    └── DEMO_FLOW.md                    # step-by-step demo for judges
```

---

## Complete Workload Breakdown

### PHASE 1 — Crypto Primitives (crypto/)
**What:** Implement stealth address math in TypeScript.

**Tasks:**
- [ ] `keys.ts` — Generate meta-address: create random scan keypair (ks, Ks) and spend keypair (ksp, Ksp). Meta-address = (Ks, Ksp).
- [ ] `stealth.ts` — Sender side: given meta-address (Ks, Ksp), pick random r, compute shared secret S = r·Ks, derive stealth address P = ksp·G + hash(S)·G. Also compute ephemeral key R = r·G to post on-chain.
- [ ] `scan.ts` — Receiver side: for each (R, announced address), compute S = ks·R, check if hash(S)·G + Ksp = announced address. If yes, this payment is yours. Derive private key = ksp + hash(S).
- [ ] `tests/stealth.test.ts` — Unit tests: generate keys, send, scan, verify.

**Key dependency:** `@noble/secp256k1` or `@noble/ed25519` for EC math (both are pure JS, audited).

---

### PHASE 2 — Soroban Contracts (contracts/)
**What:** Two Rust contracts deployed to Stellar Testnet.

#### Contract 1: `stealth_registry`
**Purpose:** Announcement board — senders post (stealth_address, ephemeral_key R) so recipients can scan.

**Functions to implement:**
- [ ] `announce(stealth_address: Address, ephemeral_key: Bytes)` — store announcement in ledger storage
- [ ] `get_announcements(from_index: u32, count: u32) → Vec<Announcement>` — paginated read for scanner
- [ ] `get_announcement_count() → u32` — how many total announcements exist

**Storage:** Sequence-indexed map of announcements. Each entry: `{ stealth_address, ephemeral_key, timestamp, sender (optional) }`.

#### Contract 2: `zk_verifier`
**Purpose:** Verify a Groth16 ZK proof on-chain.

**Functions to implement:**
- [ ] `verify_proof(proof: Bytes, public_inputs: Vec<u256>) → bool` — run Groth16 pairing check
- [ ] `verify_and_register(proof: Bytes, nullifier: u256) → bool` — verify + store nullifier to prevent double-use

**Note:** Groth16 verifier in Soroban is non-trivial due to BN254 pairing math. Options:
- Port a minimal Groth16 verifier from Ethereum (Solidity → Rust)
- Use Noir's built-in verifier export which generates a Rust verifier
- For hackathon: off-chain verify + on-chain nullifier registry is acceptable shortcut

---

### PHASE 3 — ZK Circuit (circuits/)
**What:** A circuit that proves: "I know the private scan key ks such that ks·R_i = S_i and hash(S_i)·G + Ksp = P_i for a list of stealth addresses P_i."

#### Circuit inputs:
**Private (not revealed):**
- `ks` — scan private key
- `ksp` — spend private key
- `r_list[]` — ephemeral scalars (or derived shared secrets S_i)

**Public (revealed to verifier):**
- `stealth_addresses[]` — the list of P_i being claimed
- `meta_address_hash` — hash of (Ks, Ksp) as identity anchor
- `nullifier` — hash(ks, context) to prevent reuse

#### Circuit constraints:
- [ ] For each i: verify S_i = ks·R_i (EC scalar multiplication)
- [ ] For each i: verify P_i = Ksp + hash(S_i)·G (stealth address reconstruction)
- [ ] Compute nullifier = Poseidon(ks, context_string)
- [ ] Expose nullifier and stealth_addresses as public outputs

**Tooling:**
- Circom 2 with circomlib (for Poseidon hash, EC point operations)
- OR Noir (recommended — cleaner Rust interop, built-in EC gadgets)
- Trusted setup: use Hermez perpetual powers of tau (already available for Groth16)

---

### PHASE 4 — Frontend (frontend/)
**What:** Three-panel React UI.

#### Page 1: Send (`/send`)
- [ ] Connect Freighter wallet
- [ ] Input: recipient meta-address
- [ ] Input: amount (XLM or USDC)
- [ ] On submit: run `stealth.ts` derivation, get one-time address P and ephemeral key R
- [ ] Call `stealth_registry.announce(P, R)` via Soroban
- [ ] Send XLM/USDC to P via Stellar payment operation
- [ ] Show tx hash + confirmation

#### Page 2: Receive (`/receive`)
- [ ] Connect Freighter wallet
- [ ] Input: private scan key (kept local, never sent anywhere)
- [ ] Button: "Scan for my payments"
- [ ] Fetch all announcements from `stealth_registry`
- [ ] Run `scan.ts` over them locally
- [ ] Display: list of stealth addresses that belong to user + balances
- [ ] Button per address: "Claim" (sign tx to sweep to main wallet)

#### Page 3: Prove (`/prove`)
- [ ] Input: list of stealth addresses to prove ownership of
- [ ] Input: private keys (scan key, spend key) — local only
- [ ] Button: "Generate ZK Proof"
- [ ] Run snarkjs locally in browser to generate Groth16 proof
- [ ] Display proof + public inputs
- [ ] Button: "Submit proof on-chain" → calls `zk_verifier.verify_and_register`
- [ ] Show nullifier stored on-chain as proof of unique-person verification

---

### PHASE 5 — Integration + Testing
- [ ] End-to-end test: Maria sends → Rosa scans → Rosa claims
- [ ] End-to-end test: Rosa generates proof → verifier accepts → nullifier stored
- [ ] Testnet deployment of both contracts
- [ ] Freighter wallet signing works for all 3 operations
- [ ] Error handling: invalid proof, already-used nullifier, insufficient balance

---

### PHASE 6 — Docs + Demo
- [ ] `ARCHITECTURE.md` — system diagram, contract addresses, flow
- [ ] `MATH.md` — EC derivation formulas (for judges)
- [ ] `DEMO_FLOW.md` — step by step: open app → send → scan → prove
- [ ] 3-minute demo video script
- [ ] DoraHacks submission write-up

---

## Key Dependencies

```json
// frontend/package.json
{
  "dependencies": {
    "@stellar/stellar-sdk": "^12.x",
    "@stellar/freighter-api": "^1.x",
    "snarkjs": "^0.7.x",
    "@noble/secp256k1": "^2.x",
    "@noble/hashes": "^1.x",
    "react": "^18.x",
    "typescript": "^5.x"
  }
}
```

```toml
# contracts/Cargo.toml
[dependencies]
soroban-sdk = "21.x"
```

```
# circuits (if using Noir)
nargo (Noir CLI) >= 0.30
```

---

## Suggested Build Order

1. `crypto/stealth.ts` + tests — validate the math works before touching blockchain
2. `contracts/stealth_registry` — deploy to testnet, verify announce/scan cycle
3. `circuits/stealth_ownership` — compile circuit, generate test proof off-chain
4. `contracts/zk_verifier` — integrate verifier or nullifier-only shortcut
5. `frontend/` — wire everything together
6. Integration test on testnet
7. Docs + demo video

---

## Hackathon Shortcuts (if time is tight)

| Full version | Acceptable shortcut |
|---|---|
| On-chain Groth16 verifier | Off-chain proof generation + on-chain nullifier registry only |
| Full scanning UI | CLI scanner script + manual claim |
| Noir circuit | Pre-compiled circuit with hardcoded test proof |
| Freighter wallet signing | Hardcoded testnet keypair for demo |

---

## What Makes This Win

- **Real problem:** documented kidnapping/extortion incidents linked to address traceability
- **Stellar fit:** UNHCR partnership, MoneyGram MGUSD, remittance-native chain
- **ZK is core:** not bolted on — the linkability proof is the privacy primitive for compliance
- **Compliant privacy:** view keys + ZK selective disclosure, not anonymous mixing
- **Working demo > theory:** judges reward a live Testnet demo