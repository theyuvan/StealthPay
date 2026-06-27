'use strict'
const { secp256k1 } = require('@noble/curves/secp256k1.js')
const { bytesToHex } = require('@noble/hashes/utils.js')
const { pointToScalar, CURVE_N, deriveStellarKeypair } = require('./stealth')

const G = secp256k1.Point.BASE

function scanAnnouncements(metaPrivHex, metaPubHex, announcements) {
  const km    = BigInt('0x' + metaPrivHex)
  const Kmeta = secp256k1.Point.fromHex(metaPubHex)

  const owned = []
  for (const ann of announcements) {
    try {
      const R = secp256k1.Point.fromHex(ann.ephemeralR)
      const S = R.multiply(km)
      const h = pointToScalar(S)
      // Expected stealth pub = metaPub + h·G
      const expectedP = Kmeta.add(G.multiply(h))
      if (bytesToHex(expectedP.toBytes(true)) === ann.stealthAddress) {
        const { stellarAddress, stellarSecret } = deriveStellarKeypair(metaPrivHex, ann.ephemeralR)
        owned.push({ ...ann, stellarAddress, stellarSecret })
      }
    } catch {
      // skip malformed or unrelated entries
    }
  }
  return owned
}

module.exports = { scanAnnouncements }
