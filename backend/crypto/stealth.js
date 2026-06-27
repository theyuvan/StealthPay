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

function pointToScalar(point) {
  return bytesToBigInt(sha256(point.toBytes(true))) % CURVE_N
}

// Derive a Stellar ed25519 keypair from the ECDH shared point S.
function sharedPointToStellarKeypair(sharedPoint) {
  const seed = sha256(sharedPoint.toBytes(true))
  const keypair = StellarSdk.Keypair.fromRawEd25519Seed(Buffer.from(seed))
  return {
    stellarAddress: keypair.publicKey(),
    stellarSecret:  keypair.secret(),
  }
}

// ── Sender ────────────────────────────────────────────────────────────────────
// metaAddress = single secp256k1 public key
// r  = random scalar, R = r·G
// S  = r·metaPub  (ECDH)
// h  = SHA256(S_compressed) mod n
// P  = metaPub + h·G  (secp256k1 stealth pub — used for ZK proof)
// stellarAddress derived from SHA256(S_compressed)
function deriveStealthAddress(metaPubHex) {
  const rBytes = secp256k1.utils.randomSecretKey()
  const r = bytesToBigInt(rBytes)

  const R    = G.multiply(r)
  const Kmeta = secp256k1.Point.fromHex(metaPubHex)
  const S    = Kmeta.multiply(r)
  const h    = pointToScalar(S)
  const P    = Kmeta.add(G.multiply(h))

  const { stellarAddress } = sharedPointToStellarKeypair(S)

  return {
    stealthPub:     bytesToHex(P.toBytes(true)),
    ephemeralR:     bytesToHex(R.toBytes(true)),
    stellarAddress,
  }
}

// ── Recipient: derive secp256k1 spend key for ZK proof ────────────────────────
// p = (metaPriv + h) mod n
function deriveSpendKey(metaPrivHex, ephemeralRHex) {
  const km = BigInt('0x' + metaPrivHex)
  const R  = secp256k1.Point.fromHex(ephemeralRHex)
  const S  = R.multiply(km)
  const h  = pointToScalar(S)
  const stealthPriv = (km + h) % CURVE_N
  return bytesToHex(bigIntTo32Bytes(stealthPriv))
}

// ── Recipient: derive Stellar keypair to control the stealth account ───────────
// S = metaPriv·R  (same shared point sender computed)
function deriveStellarKeypair(metaPrivHex, ephemeralRHex) {
  const km = BigInt('0x' + metaPrivHex)
  const R  = secp256k1.Point.fromHex(ephemeralRHex)
  const S  = R.multiply(km)
  return sharedPointToStellarKeypair(S)
}

module.exports = { deriveStealthAddress, deriveSpendKey, deriveStellarKeypair, pointToScalar, CURVE_N }
