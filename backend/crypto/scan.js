'use strict'
const { secp256k1 } = require('@noble/curves/secp256k1.js')
const { bytesToHex } = require('@noble/hashes/utils.js')
const { pointToScalar, CURVE_N, deriveStellarKeypair } = require('./stealth')

const G = secp256k1.Point.BASE

function scanAnnouncements(scanPrivHex, spendPubHex, announcements) {
  const ks  = BigInt('0x' + scanPrivHex)
  const Ksp = secp256k1.Point.fromHex(spendPubHex)

  const owned = []
  for (const ann of announcements) {
    try {
      const R = secp256k1.Point.fromHex(ann.ephemeralR)
      const S = R.multiply(ks)
      const h = pointToScalar(S)
      const expectedP = Ksp.add(G.multiply(h))
      if (bytesToHex(expectedP.toBytes(true)) === ann.stealthAddress) {
        const { stellarAddress, stellarSecret } = deriveStellarKeypair(scanPrivHex, ann.ephemeralR)
        owned.push({ ...ann, stellarAddress, stellarSecret })
      }
    } catch {
      // skip malformed or unrelated entries
    }
  }
  return owned
}

module.exports = { scanAnnouncements }
