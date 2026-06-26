'use strict'
const { secp256k1 } = require('@noble/curves/secp256k1.js')
const { bytesToHex } = require('@noble/hashes/utils.js')

function generateMetaAddress() {
  const scanPriv = secp256k1.utils.randomSecretKey()
  const spendPriv = secp256k1.utils.randomSecretKey()
  const scanPub = secp256k1.getPublicKey(scanPriv, true)
  const spendPub = secp256k1.getPublicKey(spendPriv, true)

  return {
    scanPriv: bytesToHex(scanPriv),
    spendPriv: bytesToHex(spendPriv),
    scanPub: bytesToHex(scanPub),
    spendPub: bytesToHex(spendPub),
    metaAddress: `${bytesToHex(scanPub)}:${bytesToHex(spendPub)}`
  }
}

module.exports = { generateMetaAddress }
