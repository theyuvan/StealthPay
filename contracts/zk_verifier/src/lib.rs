#![no_std]
extern crate alloc;

use alloc::vec;
use alloc::vec::Vec;

use ark_bn254::{Bn254, Fq, Fq2, Fr, G1Affine, G2Affine};
use ark_ec::AffineRepr;
use ark_ff::PrimeField;
use ark_groth16::{prepare_verifying_key, Groth16, PreparedVerifyingKey, Proof, VerifyingKey};

use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, BytesN, Env, Symbol, symbol_short,
};

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");

// ── Groth16 Verification Key (from circuits/build/verification_key.json) ──────
// G1 points: (x, y) as 32-byte big-endian hex
// G2 points: snarkjs stores [xi, xr], [yi, yr] — we map xi→c1, xr→c0 for ark Fq2

fn hex32(s: &str) -> [u8; 32] {
    let mut out = [0u8; 32];
    let b = s.as_bytes();
    for i in 0..32 {
        let hi = hex_nibble(b[i * 2]);
        let lo = hex_nibble(b[i * 2 + 1]);
        out[i] = (hi << 4) | lo;
    }
    out
}

fn hex_nibble(b: u8) -> u8 {
    match b {
        b'0'..=b'9' => b - b'0',
        b'a'..=b'f' => b - b'a' + 10,
        _ => panic!("bad hex"),
    }
}

fn fq(hex: &str) -> Fq {
    Fq::from_be_bytes_mod_order(&hex32(hex))
}

fn fr(bytes: &[u8]) -> Fr {
    Fr::from_be_bytes_mod_order(bytes)
}

fn g1(x_hex: &str, y_hex: &str) -> G1Affine {
    G1Affine::new_unchecked(fq(x_hex), fq(y_hex))
}

// snarkjs G2 format: [[xi, xr], [yi, yr]]
// ark Fq2::new(c0=real, c1=imag)
fn g2(xi: &str, xr: &str, yi: &str, yr: &str) -> G2Affine {
    G2Affine::new_unchecked(
        Fq2::new(fq(xr), fq(xi)),
        Fq2::new(fq(yr), fq(yi)),
    )
}

fn build_pvk() -> PreparedVerifyingKey<Bn254> {
    let vk: VerifyingKey<Bn254> = VerifyingKey {
        alpha_g1: g1(
            "25b980f44cad4c53d3882c293839992a4b256c5620f34b9acd932237a72df0cb",
            "1b86452d7705de4e9da1ce15f011b6f008631c580086cbed26d190dc87359094",
        ),
        beta_g2: g2(
            "16dd77c4c8f92f4d9766d2b3f14bd6cd10db3c353d95db206cb0cdaf0187d6ce",
            "231408e3d7f8af44554ed4a6eb8ea97f28c90ad702b36773c073dabac4b82c30",
            "16bde214c62c288de1045b7e6dc038912c0ab226964cef1c6a86a76e24045553",
            "1481fff18967bbd8829d3e748815ce0cc0e2715d07eb5c82c4419aad5e12f7ef",
        ),
        gamma_g2: g2(
            "1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed",
            "198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2",
            "12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa",
            "090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b",
        ),
        delta_g2: g2(
            "217f60fef1bf1d7c8086f1d62571a891cfe4c72698b4cd414e9cce2a8b904cd4",
            "040382056821aef9d4ee0c6df112f01907e315aa4fd1e570c97056150a8754d3",
            "2399057b8a8e404e0a93bcf265229cc4fe805a3f6712a9d90c5bdbfbb0397b8b",
            "3061817d44f0fde1217bcd26d193b54242bf4bbbd48302de20be0c4eaabc19f2",
        ),
        gamma_abc_g1: vec![
            g1("1cff8efc9f6a44391dbd8cf50167f212910313ad147b81d6f4386602b384327a",
               "2c49c9c6caa80db4dea318f24974fc154b95de67bfa63332a3ab4f56062fd119"),
            g1("03065da3ab760eecd5dce35c20ba5f0b03d944299482aeb1b9531719d597acd9",
               "0646200be14c21c122e6e40b92bff91d08129a3731bf37e9495573993fb3d857"),
            g1("1152fd0a1ab83bf3b934dfb60f566a232ef2fa61294d8bb32d4c2127e37a9a77",
               "0accc2dc0e64f85e3397a7f70667051c03832c7e07b9fa087f344c3f6cdfce84"),
            g1("1ae287bb3b35640946bb7dd96f33749bebf9f344b221a1bd4dc9f27a6f27a1f1",
               "15b4e260cfacb5ba6cc49d086f4316c2359fb402fc265781b3660770878fbf6a"),
        ],
    };
    prepare_verifying_key(&vk)
}

// Proof bytes layout (256 bytes, all big-endian 32-byte field elements):
//   [0..32]   pi_a.x
//   [32..64]  pi_a.y
//   [64..96]  pi_b.x.c1  (imaginary — snarkjs stores imaginary first)
//   [96..128] pi_b.x.c0  (real)
//   [128..160] pi_b.y.c1
//   [160..192] pi_b.y.c0
//   [192..224] pi_c.x
//   [224..256] pi_c.y
fn parse_proof(raw: &[u8; 256]) -> Proof<Bn254> {
    Proof {
        a: G1Affine::new_unchecked(
            Fq::from_be_bytes_mod_order(&raw[0..32]),
            Fq::from_be_bytes_mod_order(&raw[32..64]),
        ),
        b: G2Affine::new_unchecked(
            Fq2::new(
                Fq::from_be_bytes_mod_order(&raw[96..128]),  // c0 = real
                Fq::from_be_bytes_mod_order(&raw[64..96]),   // c1 = imag
            ),
            Fq2::new(
                Fq::from_be_bytes_mod_order(&raw[160..192]), // c0 = real
                Fq::from_be_bytes_mod_order(&raw[128..160]), // c1 = imag
            ),
        ),
        c: G1Affine::new_unchecked(
            Fq::from_be_bytes_mod_order(&raw[192..224]),
            Fq::from_be_bytes_mod_order(&raw[224..256]),
        ),
    }
}

// Public inputs layout (96 bytes):
//   [0..32]  public_signals[0] = metaCommitment
//   [32..64] public_signals[1] = nullifier
//   [64..96] public_signals[2] = context
fn parse_public_inputs(raw: &[u8; 96]) -> Vec<Fr> {
    vec![
        fr(&raw[0..32]),
        fr(&raw[32..64]),
        fr(&raw[64..96]),
    ]
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ProofRecord {
    pub meta_commitment: BytesN<32>,
    pub nullifier:       BytesN<32>,
    pub context:         BytesN<32>,
    pub proof_hash:      BytesN<32>,
    pub submitter:       Address,
    pub timestamp:       u64,
}

#[contract]
pub struct ZkVerifier;

#[contractimpl]
impl ZkVerifier {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("already initialised");
        }
        env.storage().instance().set(&ADMIN_KEY, &admin);
    }

    /// Verify a Groth16 StealthOwnership proof on-chain and register the nullifier.
    ///
    /// proof_bytes (256 bytes): pi_a.x || pi_a.y || pi_b.x1 || pi_b.x0 || pi_b.y1 || pi_b.y0 || pi_c.x || pi_c.y
    /// pub_bytes   (96 bytes):  metaCommitment || nullifier || context   (each 32 bytes BE)
    pub fn verify_and_register(
        env: Env,
        submitter: Address,
        proof_bytes: BytesN<256>,
        pub_bytes: BytesN<96>,
    ) -> bool {
        submitter.require_auth();

        let proof_arr = proof_bytes.to_array();
        let pub_arr   = pub_bytes.to_array();

        // Parse inputs
        let proof  = parse_proof(&proof_arr);
        let inputs = parse_public_inputs(&pub_arr);

        // Groth16 on-chain verification
        let pvk   = build_pvk();
        let g_ic  = Groth16::<Bn254>::prepare_inputs(&pvk, &inputs)
            .expect("prepare inputs failed");
        let valid = Groth16::<Bn254>::verify_proof_with_prepared_inputs(&pvk, &proof, &g_ic)
            .unwrap_or(false);

        if !valid {
            panic!("invalid zk proof");
        }

        // Extract nullifier (public_signals[1]) for replay protection
        let nullifier_key = BytesN::<32>::from_array(&env, &pub_arr[32..64].try_into().unwrap());

        if env.storage().persistent().has(&nullifier_key) {
            panic!("nullifier already used");
        }

        let meta_commitment = BytesN::<32>::from_array(&env, &pub_arr[0..32].try_into().unwrap());
        let context         = BytesN::<32>::from_array(&env, &pub_arr[64..96].try_into().unwrap());

        // Hash the raw proof bytes for auditability
        let proof_hash = env.crypto().sha256(&soroban_sdk::Bytes::from_slice(&env, &proof_arr));
        let proof_hash_bn: BytesN<32> = proof_hash.into();

        let record = ProofRecord {
            meta_commitment,
            nullifier: nullifier_key.clone(),
            context,
            proof_hash: proof_hash_bn,
            submitter,
            timestamp: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&nullifier_key, &record);

        env.events().publish(
            (symbol_short!("verified"),),
            (record.meta_commitment.clone(), nullifier_key.clone()),
        );

        true
    }

    // Keep old register_proof for backward compat (off-chain verify path)
    pub fn register_proof(
        env: Env,
        submitter: Address,
        meta_commitment: BytesN<32>,
        nullifier: BytesN<32>,
        context: BytesN<32>,
        proof_hash: BytesN<32>,
    ) -> bool {
        submitter.require_auth();
        if env.storage().persistent().has(&nullifier) {
            panic!("nullifier already used");
        }
        let record = ProofRecord {
            meta_commitment: meta_commitment.clone(),
            nullifier: nullifier.clone(),
            context,
            proof_hash,
            submitter,
            timestamp: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&nullifier, &record);
        env.events().publish((symbol_short!("verified"),), (meta_commitment, nullifier));
        true
    }

    pub fn is_nullifier_used(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&nullifier)
    }

    pub fn get_proof_record(env: Env, nullifier: BytesN<32>) -> Option<ProofRecord> {
        env.storage().persistent().get(&nullifier)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN_KEY).unwrap()
    }
}
