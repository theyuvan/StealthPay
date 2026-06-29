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
const { computeProof } = require('./generate_proof')

// ── Horizon (classic Stellar) ─────────────────────────────────────────────────
const TESTNET_SERVER = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org')
const TESTNET_PASSPHRASE = StellarSdk.Networks.TESTNET

// ── Soroban RPC + Deployed Contract IDs (Testnet) ────────────────────────────
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org'
const REGISTRY_ID   = 'CCZIV6AMJENSG4KL5672UETO6QSSBH7DFCUYZBFKOT6AJKBH5KJONTT2'
const VERIFIER_ID   = 'CC7DILNIL3JHPW4Y75TQBYPLFV7WWXV2DFP5GXFA7ZZRWKT3DBJNVCZR'

const rpcServer = new StellarSdk.rpc.Server(SOROBAN_RPC_URL)

// Testnet relayer — signs contract mutations (announce, register_proof).
// This is a testnet-only key used as a permissionless relay.
const RELAYER = StellarSdk.Keypair.fromSecret(
  process.env.RELAYER_SECRET || 'SCO4GSVVRP3F56CBAZBRW2QFXJYPXYEQEPGFKWKXKKKNBQOEL3F7UXLU'
)

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(bodyParser.json())

const DATA_DIR = path.join(__dirname, 'data')
fs.ensureDirSync(DATA_DIR)

// Sidecar: stores stellarAddress + txHash per announcement (not on-chain).
// Indexed by stealthPub (the secp256k1 compressed pubkey that's stored on-chain).
const ANN_META_FILE = path.join(DATA_DIR, 'announcement_meta.json')
if (!fs.existsSync(ANN_META_FILE)) fs.writeJsonSync(ANN_META_FILE, {})

const META_MAP_FILE = path.join(DATA_DIR, 'meta_map.json')
if (!fs.existsSync(META_MAP_FILE)) fs.writeJsonSync(META_MAP_FILE, {})

function readAnnMeta() {
  try { return fs.readJsonSync(ANN_META_FILE) } catch { return {} }
}

// ── Soroban helpers ───────────────────────────────────────────────────────────

/** Simulate a read-only contract call and return the raw ScVal result. */
async function simulateContract(contractId, method, ...args) {
  const contract = new StellarSdk.Contract(contractId)
  const acct = await rpcServer.getAccount(RELAYER.publicKey())
  const tx = new StellarSdk.TransactionBuilder(acct, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()
  const sim = await rpcServer.simulateTransaction(tx)
  if (StellarSdk.rpc.Api.isSimulationError(sim)) throw new Error(sim.error)
  return sim.result?.retval
}

/** Submit a state-mutating contract call; poll until confirmed. */
async function invokeContract(contractId, method, ...args) {
  const contract = new StellarSdk.Contract(contractId)
  const acct = await rpcServer.getAccount(RELAYER.publicKey())
  const tx = new StellarSdk.TransactionBuilder(acct, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()
  const prepared = await rpcServer.prepareTransaction(tx)
  prepared.sign(RELAYER)
  const send = await rpcServer.sendTransaction(prepared)
  if (send.status === 'ERROR') throw new Error(JSON.stringify(send.errorResult))
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 1000))
    const poll = await rpcServer.getTransaction(send.hash)
    if (poll.status === 'SUCCESS') return poll
    if (poll.status === 'FAILED') throw new Error(`Contract call failed: ${JSON.stringify(poll)}`)
  }
  throw new Error('Transaction confirmation timed out')
}

/**
 * Convert an on-chain Announcement (scValToNative output) to the JSON shape
 * the frontend and scan module expect.
 */
function mapAnnouncement(raw, annMeta) {
  const id = Number(raw.id)
  const stealthAddress = Buffer.from(raw.stealth_address).toString('hex')
  const ephemeralR = Buffer.from(raw.ephemeral_r).toString('hex')
  const timestamp = Number(raw.timestamp) * 1000  // Soroban ledger seconds → JS ms
  const sidecar = annMeta[stealthAddress] || {}
  return {
    id,
    stealthAddress,
    ephemeralR,
    stellarAddress: sidecar.stellarAddress || null,
    timestamp,
    metadata: sidecar.txHash ? { txHash: sidecar.txHash } : null,
  }
}

/** Convert a 32-byte bigint-as-string (snarkjs output) to a 32-byte Buffer. */
function bigIntToBytes32(n) {
  return Buffer.from(BigInt(n).toString(16).padStart(64, '0'), 'hex')
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }))

// ── Announcements (on-chain via stealth_registry) ─────────────────────────────

app.get('/announcements', async (req, res) => {
  const from  = Math.max(0, parseInt(req.query.from,  10) || 0)
  const count = Math.min(50, Math.max(1, parseInt(req.query.count, 10) || 20))
  try {
    const totalScVal = await simulateContract(REGISTRY_ID, 'get_count')
    const total = StellarSdk.scValToNative(totalScVal)

    if (total === 0) return res.json({ total: 0, announcements: [] })

    const listScVal = await simulateContract(
      REGISTRY_ID, 'get_announcements',
      StellarSdk.nativeToScVal(from,  { type: 'u32' }),
      StellarSdk.nativeToScVal(count, { type: 'u32' }),
    )
    const raw = StellarSdk.scValToNative(listScVal)  // JS array of objects
    const annMeta = readAnnMeta()
    const announcements = raw.map(a => mapAnnouncement(a, annMeta))
    res.json({ total: Number(total), announcements })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/announcements', async (req, res) => {
  const { stealthAddress, ephemeralR, stellarAddress, metadata } = req.body
  if (!stealthAddress || !ephemeralR) return res.status(400).json({ error: 'missing fields' })
  try {
    await invokeContract(
      REGISTRY_ID, 'announce',
      StellarSdk.Address.fromString(RELAYER.publicKey()).toScVal(),
      StellarSdk.nativeToScVal(Buffer.from(stealthAddress, 'hex'), { type: 'bytes' }),
      StellarSdk.nativeToScVal(Buffer.from(ephemeralR,     'hex'), { type: 'bytes' }),
    )
    // Persist sidecar metadata (not in contract: stellarAddress + txHash)
    const annMeta = readAnnMeta()
    annMeta[stealthAddress] = {
      stellarAddress: stellarAddress || null,
      txHash: metadata?.txHash || null,
    }
    fs.writeJsonSync(ANN_META_FILE, annMeta)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Key routes ────────────────────────────────────────────────────────────────

app.post('/keys/generate', (_req, res) => {
  res.json(generateMetaAddress())
})

app.post('/keys/register', (req, res) => {
  const { walletAddress, metaAddress } = req.body
  if (!walletAddress || !metaAddress) return res.status(400).json({ error: 'walletAddress and metaAddress required' })
  const map = fs.readJsonSync(META_MAP_FILE)
  if (!map[walletAddress]) {
    map[walletAddress] = { metaAddress, registeredAt: Date.now() }
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

app.post('/keys/build-register-tx', async (req, res) => {
  const { walletAddress, metaAddress } = req.body
  if (!walletAddress || !metaAddress) return res.status(400).json({ error: 'walletAddress and metaAddress required' })
  try {
    const account = await TESTNET_SERVER.loadAccount(walletAddress)
    const hash = crypto.createHash('sha256').update(metaAddress).digest()
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: TESTNET_PASSPHRASE,
    })
      .addOperation(StellarSdk.Operation.manageData({
        name: 'zkstellar_meta',
        value: hash,
      }))
      .setTimeout(300)
      .build()
    res.json({ xdr: tx.toXDR(), networkPassphrase: TESTNET_PASSPHRASE })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/keys/finalize-registration', (req, res) => {
  const { walletAddress, metaAddress, txHash } = req.body
  if (!walletAddress || !metaAddress || !txHash) {
    return res.status(400).json({ error: 'walletAddress, metaAddress, and txHash required' })
  }
  const map = fs.readJsonSync(META_MAP_FILE)
  if (map[walletAddress]) {
    return res.json({ ok: true, metaAddress: map[walletAddress].metaAddress, txHash: map[walletAddress].txHash, alreadyExisted: true })
  }
  map[walletAddress] = { metaAddress, txHash, registeredAt: Date.now(), onChain: true }
  fs.writeJsonSync(META_MAP_FILE, map)
  res.json({ ok: true, metaAddress, txHash })
})

app.post('/keys/get-or-create', (req, res) => {
  const { walletAddress } = req.body
  if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' })
  const map = fs.readJsonSync(META_MAP_FILE)
  if (map[walletAddress]) {
    const { metaAddress, registeredAt } = map[walletAddress]
    return res.json({ isNew: false, metaAddress, registeredAt })
  }
  const keys = generateMetaAddress()
  map[walletAddress] = { metaAddress: keys.metaAddress, registeredAt: Date.now() }
  fs.writeJsonSync(META_MAP_FILE, map)
  res.json({ isNew: true, metaAddress: keys.metaAddress, metaPriv: keys.metaPriv })
})

// ── Stealth routes ────────────────────────────────────────────────────────────

app.post('/stealth/derive', (req, res) => {
  const { metaAddress } = req.body
  if (!metaAddress) return res.status(400).json({ error: 'metaAddress required' })
  try {
    res.json(deriveStealthAddress(metaAddress))
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/stealth/scan', async (req, res) => {
  const { metaPriv } = req.body
  if (!metaPriv) return res.status(400).json({ error: 'metaPriv required' })
  try {
    const { secp256k1 } = require('@noble/curves/secp256k1.js')
    const { bytesToHex } = require('@noble/hashes/utils.js')
    const metaPub = bytesToHex(secp256k1.getPublicKey(Buffer.from(metaPriv, 'hex'), true))

    // Fetch all announcements from on-chain
    const totalScVal = await simulateContract(REGISTRY_ID, 'get_count')
    const total = Number(StellarSdk.scValToNative(totalScVal))

    let all = []
    if (total > 0) {
      const BATCH = 50
      for (let i = 0; i < total; i += BATCH) {
        const batchScVal = await simulateContract(
          REGISTRY_ID, 'get_announcements',
          StellarSdk.nativeToScVal(i,    { type: 'u32' }),
          StellarSdk.nativeToScVal(BATCH, { type: 'u32' }),
        )
        const batch = StellarSdk.scValToNative(batchScVal)
        const annMeta = readAnnMeta()
        all = all.concat(batch.map(a => mapAnnouncement(a, annMeta)))
      }
    }

    const matched = scanAnnouncements(metaPriv, metaPub, all)
    res.json({ total: all.length, owned: matched.length, announcements: matched })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/stealth/spend-key', (req, res) => {
  const { metaPriv, ephemeralR } = req.body
  if (!metaPriv || !ephemeralR) return res.status(400).json({ error: 'metaPriv and ephemeralR required' })
  try {
    const stealthPriv = deriveSpendKey(metaPriv, ephemeralR)
    const { stellarAddress, stellarSecret } = deriveStellarKeypair(metaPriv, ephemeralR)
    res.json({ stealthPriv, stellarAddress, stellarSecret })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

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

app.get('/stealth/balance/:address', async (req, res) => {
  try {
    const account = await TESTNET_SERVER.loadAccount(req.params.address)
    const xlm = account.balances.find(b => b.asset_type === 'native')
    res.json({ address: req.params.address, balance: xlm ? xlm.balance : '0' })
  } catch {
    res.json({ address: req.params.address, balance: null, exists: false })
  }
})

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

// Encode snarkjs proof into 256 bytes for arkworks Groth16 verifier.
// snarkjs prover does NOT negate pi_a — pass coordinates as-is.
// pi_b layout: snarkjs stores [imag, real] per Fq2 coord, arkworks Fq2::new(c0=real, c1=imag).
function encodeProofBytes(proof) {
  return Buffer.concat([
    bigIntToBytes32(proof.pi_a[0]),    // pi_a.x
    bigIntToBytes32(proof.pi_a[1]),    // pi_a.y (not negated)
    bigIntToBytes32(proof.pi_b[0][0]), // pi_b.x imag (→ c1)
    bigIntToBytes32(proof.pi_b[0][1]), // pi_b.x real (→ c0)
    bigIntToBytes32(proof.pi_b[1][0]), // pi_b.y imag (→ c1)
    bigIntToBytes32(proof.pi_b[1][1]), // pi_b.y real (→ c0)
    bigIntToBytes32(proof.pi_c[0]),    // pi_c.x
    bigIntToBytes32(proof.pi_c[1]),    // pi_c.y
  ])
}

// Encode 3 public signals (metaCommitment, nullifier, context) into 96 bytes
function encodePubBytes(publicSignals) {
  return Buffer.concat([
    bigIntToBytes32(publicSignals[0]),
    bigIntToBytes32(publicSignals[1]),
    bigIntToBytes32(publicSignals[2] || '0'),
  ])
}

app.post('/stealth/claim', async (req, res) => {
  const { stellarProofKey, recipientAddress, proof, publicSignals } = req.body
  if (!stellarProofKey || !recipientAddress) {
    return res.status(400).json({ error: 'stellarProofKey and recipientAddress required' })
  }
  if (!proof || !publicSignals || publicSignals.length < 3) {
    return res.status(400).json({ error: 'proof and publicSignals (3 values) required' })
  }
  try {
    // 1. Check stealth account balance first — fail fast before spending the nullifier
    const keypair = StellarSdk.Keypair.fromSecret(stellarProofKey)
    const stealthAddress = keypair.publicKey()
    let account
    try {
      account = await TESTNET_SERVER.loadAccount(stealthAddress)
    } catch {
      return res.status(400).json({ error: `Stealth account ${stealthAddress} not found — has the sender sent XLM to it yet?` })
    }
    const xlmBal = account.balances.find(b => b.asset_type === 'native')
    const total = parseFloat(xlmBal ? xlmBal.balance : '0')
    if (total <= 0) return res.status(400).json({ error: 'Stealth account has no balance' })

    // 2. Verify ZK proof off-chain (BN254 pairings exceed Soroban WASM CPU budget;
    //    native BLS12-381 host ops would be needed for fully on-chain verification)
    const snarkjs = require('snarkjs')
    const vKey = require('../circuits/build/verification_key.json')
    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof)
    if (!isValid) return res.status(400).json({ error: 'Invalid ZK proof' })

    // 3. Register nullifier on-chain to prevent double-spend (idempotent)
    const metaCommitment = bigIntToBytes32(publicSignals[0])
    const nullifier      = bigIntToBytes32(publicSignals[1])
    const context        = bigIntToBytes32(publicSignals[2] || '0')
    const proofHash      = crypto.createHash('sha256').update(encodeProofBytes(proof)).digest()

    // Skip registration if already stored (recovery from partial failure where
    // register succeeded but accountMerge failed on a previous attempt)
    const usedScVal = await simulateContract(
      VERIFIER_ID, 'is_nullifier_used',
      StellarSdk.nativeToScVal(nullifier, { type: 'bytes' }),
    )
    const nullifierAlreadyUsed = StellarSdk.scValToNative(usedScVal)

    if (!nullifierAlreadyUsed) {
      await invokeContract(
        VERIFIER_ID, 'register_proof',
        StellarSdk.Address.fromString(RELAYER.publicKey()).toScVal(),
        StellarSdk.nativeToScVal(metaCommitment, { type: 'bytes' }),
        StellarSdk.nativeToScVal(nullifier,      { type: 'bytes' }),
        StellarSdk.nativeToScVal(context,        { type: 'bytes' }),
        StellarSdk.nativeToScVal(proofHash,      { type: 'bytes' }),
      )
    }

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: TESTNET_PASSPHRASE,
    })
      .addOperation(StellarSdk.Operation.accountMerge({ destination: recipientAddress }))
      .setTimeout(300)
      .build()
    tx.sign(keypair)
    const result = await TESTNET_SERVER.submitTransaction(tx)
    const received = (total - 0.00001).toFixed(7)

    res.json({ success: true, hash: result.hash, amount: received, stealthAddress })
  } catch (e) {
    const detail = e.response?.data?.extras?.result_codes || e.message
    res.status(400).json({ error: JSON.stringify(detail) })
  }
})

// ── ZK proof routes ───────────────────────────────────────────────────────────

app.post('/zk/prove', async (req, res) => {
  const { metaPriv, context } = req.body
  if (!metaPriv) return res.status(400).json({ error: 'metaPriv required' })
  try {
    const result = await computeProof(metaPriv, metaPriv, context || '01')
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/zk/verify', async (req, res) => {
  const { proof, publicSignals } = req.body
  if (!proof || !publicSignals) return res.status(400).json({ error: 'proof and publicSignals are required' })
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
const PORT = Number.parseInt(process.env.PORT || '4000', 10)
const MAX_PORT_RETRIES = 25

function startServer(port, retriesLeft = MAX_PORT_RETRIES) {
  const server = app.listen(port, () => {
    console.log(`ZK Stellar backend listening on ${port}`)
    console.log(`  stealth_registry: ${REGISTRY_ID}`)
    console.log(`  zk_verifier:      ${VERIFIER_ID}`)
    console.log(`  relayer:          ${RELAYER.publicKey()}`)
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = port + 1
      console.warn(`Port ${port} is already in use, retrying on ${nextPort}...`)
      server.close(() => startServer(nextPort, retriesLeft - 1))
      return
    }

    console.error(error)
    process.exit(1)
  })
}

startServer(PORT)
