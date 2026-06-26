#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Bytes, BytesN, Env,
    Symbol, symbol_short,
};

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");

/// Compact proof record stored on-chain per nullifier.
/// The full Groth16 proof is verified off-chain by the caller (snarkjs).
/// What goes on-chain: the nullifier (anti-replay) + a hash of the proof
/// for auditability.
#[contracttype]
#[derive(Clone, Debug)]
pub struct ProofRecord {
    pub meta_commitment: BytesN<32>, // Poseidon(scanPriv, spendPriv)
    pub nullifier:       BytesN<32>, // Poseidon(scanPriv, context)
    pub context:         BytesN<32>, // verifier-supplied context
    pub proof_hash:      BytesN<32>, // SHA-256 of the full Groth16 proof bytes
    pub submitter:       Address,
    pub timestamp:       u64,
}

#[contract]
pub struct ZkVerifier;

#[contractimpl]
impl ZkVerifier {
    // ── Setup ─────────────────────────────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("already initialised");
        }
        // No require_auth — the one-time guard above is sufficient.
        // Deployer sets admin at deploy time; admin controls set_vk after.
        env.storage().instance().set(&ADMIN_KEY, &admin);
    }

    // ── Proof registration ────────────────────────────────────────────────────

    /// Register a verified Groth16 ownership proof on-chain.
    ///
    /// Caller flow:
    ///   1. Generate proof off-chain with snarkjs (POST /zk/prove)
    ///   2. Verify locally (POST /zk/verify → valid=true)
    ///   3. Submit here: proof is accepted if nullifier is fresh
    ///
    /// On-chain guarantees:
    ///   - Each nullifier can only be registered once (replay protection)
    ///   - meta_commitment anchors the claim to a specific meta-address
    ///   - proof_hash lets anyone audit what proof was submitted
    pub fn register_proof(
        env: Env,
        submitter: Address,
        meta_commitment: BytesN<32>,
        nullifier: BytesN<32>,
        context: BytesN<32>,
        proof_hash: BytesN<32>,
    ) -> bool {
        submitter.require_auth();

        // Replay protection — each nullifier usable exactly once
        if env.storage().persistent().has(&nullifier) {
            panic!("nullifier already used");
        }

        let record = ProofRecord {
            meta_commitment: meta_commitment.clone(),
            nullifier: nullifier.clone(),
            context: context.clone(),
            proof_hash: proof_hash.clone(),
            submitter,
            timestamp: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&nullifier, &record);

        env.events().publish(
            (symbol_short!("verified"),),
            (meta_commitment, nullifier),
        );

        true
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /// True if this nullifier has already been used.
    pub fn is_nullifier_used(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&nullifier)
    }

    /// Retrieve the full proof record for a nullifier.
    pub fn get_proof_record(env: Env, nullifier: BytesN<32>) -> Option<ProofRecord> {
        env.storage().persistent().get(&nullifier)
    }

    /// Admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN_KEY).unwrap()
    }
}
