const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const fs = require('fs-extra')
const path = require('path')
const crypto = require('crypto')

const StellarSdk = require('@stellar/stellar-sdk')
const { generateMetaAddress } = require('./crypto/keys')
const { deriveStealthAddress, deriveSpendKey, deriveStellarKeypair } = require('./crypto/stealth')
const { scanAnnouncements } = require('./crypto/scan')

const TESTNET_SERVER = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org')
const TESTNET_PASSPHRASE = StellarSdk.Networks.TESTNET
const { computeProof } = require('../circuits/scripts/generate_proof')

const app = express()
app.use(cors())
app.use(bodyParser.json())

const DATA_DIR = path.join(__dirname, 'data')
fs.ensureDirSync(DATA_DIR)

const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json')
if (!fs.existsSync(ANNOUNCEMENTS_FILE)) fs.writeJsonSync(ANNOUNCEMENTS_FILE, [])

function readAnnouncements() {
  try {
    const data = fs.readJsonSync(ANNOUNCEMENTS_FILE)
    return Array.isArray(data) ? data : []
  } catch {
    fs.writeJsonSync(ANNOUNCEMENTS_FILE, [])
    return []
  }
}

function writeAnnouncements(list) {
  fs.writeJsonSync(ANNOUNCEMENTS_FILE, list)
}

app.get('/health', (req, res) => res.json({ ok: true }))

// list announcements with pagination
app.get('/announcements', (req, res) => {
  const { from = 0, count = 20 } = req.query
  const list = readAnnouncements()
  const f = parseInt(from, 10) || 0
  const c = Math.min(100, parseInt(count, 10) || 20)
  res.json({ total: list.length, announcements: list.slice(f, f + c) })
})

// post a new announcement: { stealthAddress, ephemeralR, metadata }
app.post('/announcements', (req, res) => {
  const { stealthAddress, ephemeralR, metadata } = req.body
  if (!stealthAddress || !ephemeralR) return res.status(400).json({ error: 'missing fields' })
  const list = readAnnouncements()
  const entry = {
    id: list.length,
    stealthAddress,
    ephemeralR,
    metadata: metadata || null,
    timestamp: Date.now()
  }
  list.push(entry)
  writeAnnouncements(list)
  res.json({ ok: true, entry })
})

// ── Crypto routes ────────────────────────────────────────────────────────────

// Generate a fresh meta-address (scan keypair + spend keypair).
// The caller must save all four keys; only metaAddress is meant to be shared.
app.post('/keys/generate', (_req, res) => {
  res.json(generateMetaAddress())
})

// Derive a one-time stealth address from a recipient's meta-address.
// Body: { metaAddress } OR { scanPub, spendPub }
// Returns: { stealthPub, ephemeralR }
app.post('/stealth/derive', (req, res) => {
  let { scanPub, spendPub, metaAddress } = req.body
  if (metaAddress && !scanPub) {
    const parts = metaAddress.split(':')
    if (parts.length !== 2) {
      return res.status(400).json({ error: 'metaAddress must be "scanPub:spendPub"' })
    }
    ;[scanPub, spendPub] = parts
  }
  if (!scanPub || !spendPub) {
    return res.status(400).json({ error: 'scanPub and spendPub are required' })
  }
  try {
    res.json(deriveStealthAddress(scanPub, spendPub))
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// Scan all stored announcements for payments owned by the given scan key.
// Body: { scanPriv, spendPub }
// Returns: { total, owned, announcements: [...matched entries] }
app.post('/stealth/scan', (req, res) => {
  const { scanPriv, spendPub } = req.body
  if (!scanPriv || !spendPub) {
    return res.status(400).json({ error: 'scanPriv and spendPub are required' })
  }
  try {
    const all = readAnnouncements()
    const matched = scanAnnouncements(scanPriv, spendPub, all)
    res.json({ total: all.length, owned: matched.length, announcements: matched })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// Derive the spend private key + Stellar keypair for a claimed stealth address.
// Body: { scanPriv, spendPriv, ephemeralR }
// Returns: { stealthPriv, stellarAddress, stellarSecret }
app.post('/stealth/spend-key', (req, res) => {
  const { scanPriv, spendPriv, ephemeralR } = req.body
  if (!scanPriv || !spendPriv || !ephemeralR) {
    return res.status(400).json({ error: 'scanPriv, spendPriv, and ephemeralR are required' })
  }
  try {
    const stealthPriv = deriveSpendKey(scanPriv, spendPriv, ephemeralR)
    const { stellarAddress, stellarSecret } = deriveStellarKeypair(scanPriv, ephemeralR)
    res.json({ stealthPriv, stellarAddress, stellarSecret })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// Fund a stealth Stellar account from testnet friendbot (creates it if it doesn't exist).
// Body: { stellarAddress }
// Returns: { funded: bool, balance: string }
app.post('/stealth/fund', async (req, res) => {
  const { stellarAddress } = req.body
  if (!stellarAddress) return res.status(400).json({ error: 'stellarAddress required' })
  try {
    await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(stellarAddress)}`)
    const account = await TESTNET_SERVER.loadAccount(stellarAddress)
    const xlm = account.balances.find(b => b.asset_type === 'native')
    res.json({ funded: true, balance: xlm ? xlm.balance : '0' })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// Get balance of any Stellar address on testnet.
// GET /stealth/balance/:address
app.get('/stealth/balance/:address', async (req, res) => {
  try {
    const account = await TESTNET_SERVER.loadAccount(req.params.address)
    const xlm = account.balances.find(b => b.asset_type === 'native')
    res.json({ address: req.params.address, balance: xlm ? xlm.balance : '0' })
  } catch {
    res.json({ address: req.params.address, balance: null, exists: false })
  }
})

// Build an unsigned Stellar payment XDR for the sender to sign with their wallet.
// Body: { fromAddress, toAddress (stealth G…), amount }
// Returns: { xdr } — submit to wallet for signing, then POST /stealth/submit
app.post('/stealth/build-tx', async (req, res) => {
  const { fromAddress, toAddress, amount } = req.body
  if (!fromAddress || !toAddress || !amount) {
    return res.status(400).json({ error: 'fromAddress, toAddress, and amount required' })
  }
  try {
    const sourceAccount = await TESTNET_SERVER.loadAccount(fromAddress)
    let destExists = true
    try { await TESTNET_SERVER.loadAccount(toAddress) } catch { destExists = false }

    const builder = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: TESTNET_PASSPHRASE,
    }).setTimeout(300)

    if (!destExists) {
      // createAccount requires minimum 1 XLM to activate the account
      builder.addOperation(StellarSdk.Operation.createAccount({
        destination: toAddress,
        startingBalance: String(Math.max(parseFloat(amount), 1)),
      }))
    } else {
      builder.addOperation(StellarSdk.Operation.payment({
        destination: toAddress,
        asset: StellarSdk.Asset.native(),
        amount: String(amount),
      }))
    }

    const tx = builder.build()
    res.json({ xdr: tx.toXDR(), networkPassphrase: TESTNET_PASSPHRASE })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// Submit a signed XDR transaction to testnet.
// Body: { signedXdr }
// Returns: { hash, success }
app.post('/stealth/submit', async (req, res) => {
  const { signedXdr } = req.body
  if (!signedXdr) return res.status(400).json({ error: 'signedXdr required' })
  try {
    const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, TESTNET_PASSPHRASE)
    const result = await TESTNET_SERVER.submitTransaction(tx)
    res.json({ success: true, hash: result.hash })
  } catch (e) {
    const detail = e.response?.data?.extras?.result_codes || e.message
    res.status(400).json({ error: JSON.stringify(detail) })
  }
})

// ── ZK proof routes ───────────────────────────────────────────────────────────

// Generate a Groth16 ownership proof.
// Body: { scanPriv, spendPriv, context? }
// Returns: { proof, publicSignals, metaCommitment, nullifier }
// The proof can be submitted to the on-chain Soroban verifier contract.
app.post('/zk/prove', async (req, res) => {
  const { scanPriv, spendPriv, context } = req.body
  if (!scanPriv || !spendPriv) {
    return res.status(400).json({ error: 'scanPriv and spendPriv are required' })
  }
  try {
    const result = await computeProof(scanPriv, spendPriv, context || '01')
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Verify a proof locally (off-chain check before on-chain submission).
// Body: { proof, publicSignals }
// Returns: { valid: bool }
app.post('/zk/verify', async (req, res) => {
  const { proof, publicSignals } = req.body
  if (!proof || !publicSignals) {
    return res.status(400).json({ error: 'proof and publicSignals are required' })
  }
  try {
    const snarkjs = require('snarkjs')
    const vKey = require('../circuits/build/verification_key.json')
    const valid = await snarkjs.groth16.verify(vKey, publicSignals, proof)
    res.json({ valid })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────

// Register a wallet ↔ meta-address mapping (one per wallet).
// Body: { walletAddress, metaAddress, scanPub, spendPub }
const META_MAP_FILE = path.join(DATA_DIR, 'meta_map.json')
if (!fs.existsSync(META_MAP_FILE)) fs.writeJsonSync(META_MAP_FILE, {})

app.post('/keys/register', (req, res) => {
  const { walletAddress, metaAddress, scanPub, spendPub } = req.body
  if (!walletAddress || !metaAddress) return res.status(400).json({ error: 'walletAddress and metaAddress required' })
  const map = fs.readJsonSync(META_MAP_FILE)
  if (!map[walletAddress]) {
    map[walletAddress] = { metaAddress, scanPub, spendPub, registeredAt: Date.now() }
    fs.writeJsonSync(META_MAP_FILE, map)
  }
  res.json({ ok: true, metaAddress: map[walletAddress].metaAddress })
})

app.get('/keys/meta/:walletAddress', (req, res) => {
  const map = fs.readJsonSync(META_MAP_FILE)
  const entry = map[req.params.walletAddress]
  if (!entry) return res.json({ exists: false })
  res.json({ exists: true, ...entry })
})

// Build an on-chain registration transaction.
// The wallet signs a manageData op that stores SHA256(metaAddress) under key
// "zkstellar_meta" on the wallet's Stellar account — proving ownership on-chain.
// Body: { walletAddress, metaAddress }
// Returns: { xdr, networkPassphrase }
app.post('/keys/build-register-tx', async (req, res) => {
  const { walletAddress, metaAddress } = req.body
  if (!walletAddress || !metaAddress) {
    return res.status(400).json({ error: 'walletAddress and metaAddress required' })
  }
  try {
    const account = await TESTNET_SERVER.loadAccount(walletAddress)
    const hash = crypto.createHash('sha256').update(metaAddress).digest()
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: TESTNET_PASSPHRASE,
    })
      .addOperation(StellarSdk.Operation.manageData({
        name: 'zkstellar_meta',
        value: hash, // 32-byte SHA256 — fits in manageData's 64-byte value limit
      }))
      .setTimeout(300)
      .build()
    res.json({ xdr: tx.toXDR(), networkPassphrase: TESTNET_PASSPHRASE })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// Finalize registration after the wallet has signed and submitted the on-chain tx.
// Only stores the mapping if the wallet doesn't already have one.
// Body: { walletAddress, metaAddress, scanPub, spendPub, txHash }
// Returns: { ok, metaAddress, txHash }
app.post('/keys/finalize-registration', (req, res) => {
  const { walletAddress, metaAddress, scanPub, spendPub, txHash } = req.body
  if (!walletAddress || !metaAddress || !txHash) {
    return res.status(400).json({ error: 'walletAddress, metaAddress, and txHash required' })
  }
  const map = fs.readJsonSync(META_MAP_FILE)
  if (map[walletAddress]) {
    // Already registered — idempotent, return existing
    return res.json({ ok: true, metaAddress: map[walletAddress].metaAddress, txHash: map[walletAddress].txHash, alreadyExisted: true })
  }
  map[walletAddress] = { metaAddress, scanPub, spendPub, txHash, registeredAt: Date.now(), onChain: true }
  fs.writeJsonSync(META_MAP_FILE, map)
  res.json({ ok: true, metaAddress, txHash })
})

// Atomic get-or-create: returns existing meta-address for the wallet, or
// generates + stores a brand-new one. Never overwrites an existing entry.
// Body: { walletAddress }
// Returns: { isNew, metaAddress, scanPub, spendPub, scanPriv?, spendPriv? }
// Private keys only included when isNew=true (only time they ever leave the server).
app.post('/keys/get-or-create', (req, res) => {
  const { walletAddress } = req.body
  if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' })

  const map = fs.readJsonSync(META_MAP_FILE)

  if (map[walletAddress]) {
    // Already registered — return public fields only, never regenerate
    const { metaAddress, scanPub, spendPub, registeredAt } = map[walletAddress]
    return res.json({ isNew: false, metaAddress, scanPub, spendPub, registeredAt })
  }

  // First time for this wallet — generate and store atomically
  const keys = generateMetaAddress()
  map[walletAddress] = {
    metaAddress: keys.metaAddress,
    scanPub: keys.scanPub,
    spendPub: keys.spendPub,
    registeredAt: Date.now(),
  }
  fs.writeJsonSync(META_MAP_FILE, map)

  // Return full keys including private — only ever sent once
  res.json({
    isNew: true,
    metaAddress: keys.metaAddress,
    scanPub: keys.scanPub,
    spendPub: keys.spendPub,
    scanPriv: keys.scanPriv,
    spendPriv: keys.spendPriv,
  })
})

// Build a claim authorization transaction.
// The recipient wallet signs a manageData op that writes SHA256(nullifier) onto their
// account under key "zk_claim_auth". This proves:
//   1. The signer controls the recipient address
//   2. They are consciously authorizing this specific claim (nullifier is unique per proof)
// Body: { recipientAddress, nullifier }
// Returns: { xdr, networkPassphrase }
app.post('/stealth/build-claim-auth-tx', async (req, res) => {
  const { recipientAddress, nullifier } = req.body
  if (!recipientAddress || !nullifier) {
    return res.status(400).json({ error: 'recipientAddress and nullifier required' })
  }
  try {
    const account = await TESTNET_SERVER.loadAccount(recipientAddress)
    const nullifierHash = crypto.createHash('sha256').update(String(nullifier)).digest().slice(0, 32)
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: TESTNET_PASSPHRASE,
    })
      .addOperation(StellarSdk.Operation.manageData({
        name: 'zk_claim_auth',
        value: nullifierHash,
      }))
      .setTimeout(300)
      .build()
    res.json({ xdr: tx.toXDR(), networkPassphrase: TESTNET_PASSPHRASE })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// Claim funds: verify ZK proof, then transfer stealth → real wallet automatically.
// Body: { stellarProofKey, recipientAddress, proof, publicSignals }
// Returns: { success, hash, amount }
app.post('/stealth/claim', async (req, res) => {
  const { stellarProofKey, recipientAddress, proof, publicSignals } = req.body
  if (!stellarProofKey || !recipientAddress) {
    return res.status(400).json({ error: 'stellarProofKey and recipientAddress required' })
  }
  try {
    // Verify ZK proof if provided
    if (proof && publicSignals) {
      const snarkjs = require('snarkjs')
      const vKey = require('../circuits/build/verification_key.json')
      const valid = await snarkjs.groth16.verify(vKey, publicSignals, proof)
      if (!valid) return res.status(400).json({ error: 'ZK proof verification failed' })
    }

    // Derive stealth account from the proof key
    const keypair = StellarSdk.Keypair.fromSecret(stellarProofKey)
    const stealthAddress = keypair.publicKey()

    // Load stealth account and check balance
    const account = await TESTNET_SERVER.loadAccount(stealthAddress)
    const xlmBal = account.balances.find(b => b.asset_type === 'native')
    const total = parseFloat(xlmBal ? xlmBal.balance : '0')
    if (total <= 0) return res.status(400).json({ error: 'Stealth account has no balance' })

    // accountMerge sends the ENTIRE balance (including the 1 XLM base reserve)
    // and permanently closes the stealth account — one-time claim, nothing left behind.
    // The network deducts only the tiny tx fee (~0.00001 XLM); recipient gets everything else.
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: TESTNET_PASSPHRASE,
    })
      .addOperation(StellarSdk.Operation.accountMerge({
        destination: recipientAddress,
      }))
      .setTimeout(300)
      .build()

    tx.sign(keypair)
    const result = await TESTNET_SERVER.submitTransaction(tx)
    // Amount received = total minus the tx fee (100 stroops = 0.00001 XLM)
    const received = (total - 0.00001).toFixed(7)
    res.json({ success: true, hash: result.hash, amount: received, stealthAddress })
  } catch (e) {
    const detail = e.response?.data?.extras?.result_codes || e.message
    res.status(400).json({ error: JSON.stringify(detail) })
  }
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Stellar backend listening on ${PORT}`))
