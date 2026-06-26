'use strict'
const { secp256k1 } = require('@noble/curves/secp256k1.js')
const { sha256 } = require('@noble/hashes/sha2.js')
const { bytesToHex, hexToBytes } = require('@noble/hashes/utils.js')
const StellarSdk = require('@stellar/stellar-sdk')

const G = secp256k1.Point.BASE
const CURVE_N = secp256k1.Point.Fn.ORDER

function bytesToBigInt(bytes) {
  return BigInt('0x' + bytesToHex(bytes))
}

function bigIntTo32Bytes(n) {
  return hexToBytes(n.toString(16).padStart(64, '0'))
}

// SHA256 of compressed point bytes, returned as a scalar mod n (for secp256k1 stealth math).
function pointToScalar(point) {
  return bytesToBigInt(sha256(point.toBytes(true))) % CURVE_N
}

// Derive a Stellar ed25519 keypair from the ECDH shared point S.
// stellarSeed = SHA256(S_compressed) — same value both sender and recipient can compute.
function sharedPointToStellarKeypair(sharedPoint) {
  const seed = sha256(sharedPoint.toBytes(true)) // 32 bytes
  const keypair = StellarSdk.Keypair.fromRawEd25519Seed(Buffer.from(seed))
  return {
    stellarAddress: keypair.publicKey(),   // G… address
    stellarSecret:  keypair.secret(),      // S… secret key (only for recipient)
  }
}

// ── Sender ────────────────────────────────────────────────────────────────────
// r  = random scalar
// R  = r·G
// S  = r·Ks  (ECDH shared secret with recipient's scan public key)
// h  = SHA256(S_compressed) mod n
// P  = Ksp + h·G  (secp256k1 stealth public key — used for ZK proof)
// stellarAddress = Stellar G… account derived from SHA256(S_compressed)
function deriveStealthAddress(scanPubHex, spendPubHex) {
  const rBytes = secp256k1.utils.randomSecretKey()
  const r = bytesToBigInt(rBytes)

  const R = G.multiply(r)
  const Ks = secp256k1.Point.fromHex(scanPubHex)
  const S = Ks.multiply(r)            // ECDH shared point
  const h = pointToScalar(S)
  const Ksp = secp256k1.Point.fromHex(spendPubHex)
  const P = Ksp.add(G.multiply(h))

  const { stellarAddress } = sharedPointToStellarKeypair(S)

  return {
    stealthPub:     bytesToHex(P.toBytes(true)),
    ephemeralR:     bytesToHex(R.toBytes(true)),
    stellarAddress,                              // real Stellar G… account for this payment
  }
}

// ── Recipient ─────────────────────────────────────────────────────────────────
// p = (ksp + h) mod n  — secp256k1 spend key (for ZK proof)
function deriveSpendKey(scanPrivHex, spendPrivHex, ephemeralRHex) {
  const ks  = BigInt('0x' + scanPrivHex)
  const ksp = BigInt('0x' + spendPrivHex)
  const R   = secp256k1.Point.fromHex(ephemeralRHex)
  const S   = R.multiply(ks)
  const h   = pointToScalar(S)
  const stealthPriv = (ksp + h) % CURVE_N
  return bytesToHex(bigIntTo32Bytes(stealthPriv))
}

// Derive the Stellar keypair the recipient can use to control the stealth account.
// S = ks·R  (same shared point as the sender computed)
function deriveStellarKeypair(scanPrivHex, ephemeralRHex) {
  const ks = BigInt('0x' + scanPrivHex)
  const R  = secp256k1.Point.fromHex(ephemeralRHex)
  const S  = R.multiply(ks)
  return sharedPointToStellarKeypair(S)
}

module.exports = { deriveStealthAddress, deriveSpendKey, deriveStellarKeypair, pointToScalar, CURVE_N }
