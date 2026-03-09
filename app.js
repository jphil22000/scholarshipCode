/**
 * Cognito OIDC server (hosted UI flow).
 * Configure in .env: COGNITO_ISSUER_URL, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET (optional),
 * COGNITO_CALLBACK_URL, COGNITO_LOGOUT_DOMAIN, SESSION_SECRET.
 * Profile API uses DynamoDB: set PROFILES_TABLE and AWS credentials (or use default chain).
 */
import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import { Issuer, generators } from 'openid-client'
import path from 'path'
import { fileURLToPath } from 'url'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import * as jose from 'jose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3003

const COGNITO_ISSUER_URL = process.env.COGNITO_ISSUER_URL
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || ''
const COGNITO_CALLBACK_URL = process.env.COGNITO_CALLBACK_URL || `http://localhost:${PORT}/callback`
const COGNITO_LOGOUT_DOMAIN = process.env.COGNITO_LOGOUT_DOMAIN
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production'
const API_BACKEND_URL = process.env.API_BACKEND_URL || process.env.VITE_API_URL || ''
const PROFILES_TABLE = process.env.PROFILES_TABLE || ''
const APPLICATIONS_TABLE = process.env.APPLICATIONS_TABLE || ''
const ERRORS_TABLE = process.env.ERRORS_TABLE || ''

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
const docClient = DynamoDBDocumentClient.from(dynamoClient)

let client
let cognitoJwks = null

function getCognitoJwks() {
  if (!COGNITO_ISSUER_URL) return null
  if (!cognitoJwks) {
    const jwksUrl = `${COGNITO_ISSUER_URL.replace(/\/$/, '')}/.well-known/jwks.json`
    cognitoJwks = jose.createRemoteJWKSet(new URL(jwksUrl))
  }
  return cognitoJwks
}

/** Get userId from session (Hosted UI) or from Bearer JWT (Amplify). Returns null if not authenticated. */
async function getUserId(req) {
  const r = await getUserIdAndEmail(req)
  return r?.userId ?? null
}

/** Get userId and email (for first-admin bootstrap). Email from session.userInfo or JWT. */
async function getUserIdAndEmail(req) {
  if (req.session?.userInfo) {
    const sub = req.session.userInfo.sub
    const email = (req.session.userInfo.email || req.session.userInfo.preferred_username || '').trim().toLowerCase()
    return sub ? { userId: sub, email } : null
  }
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  try {
    const jwks = getCognitoJwks()
    if (!jwks) {
      if (!COGNITO_ISSUER_URL || !COGNITO_CLIENT_ID) {
        console.warn('Profile API: set COGNITO_ISSUER_URL and COGNITO_CLIENT_ID in .env (same as VITE_COGNITO_*) to verify Bearer token')
      }
      return null
    }
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: COGNITO_ISSUER_URL,
      audience: COGNITO_CLIENT_ID,
    })
    const email = (payload.email || payload.preferred_username || '').trim().toLowerCase()
    return payload.sub ? { userId: payload.sub, email } : null
  } catch {
    return null
  }
}

async function initializeClient() {
  if (!COGNITO_ISSUER_URL || !COGNITO_CLIENT_ID) {
    console.warn('Cognito OIDC not configured: set COGNITO_ISSUER_URL and COGNITO_CLIENT_ID in .env')
    return
  }
  const issuer = await Issuer.discover(COGNITO_ISSUER_URL)
  client = new issuer.Client({
    client_id: COGNITO_CLIENT_ID,
    ...(COGNITO_CLIENT_SECRET && { client_secret: COGNITO_CLIENT_SECRET }),
    redirect_uris: [COGNITO_CALLBACK_URL],
    response_types: ['code'],
  })
}

initializeClient().catch(console.error)

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
)

// Session API for the Vue app (same-origin only; no CORS needed when Vue is served from this server)
app.get('/api/me', (req, res) => {
  if (req.session.userInfo) {
    return res.json({ isAuthenticated: true, userInfo: req.session.userInfo })
  }
  res.json({ isAuthenticated: false })
})

// Optional: bootstrap first admin by email (set FIRST_ADMIN_EMAIL in .env; that user becomes admin on next profile load)
const FIRST_ADMIN_EMAIL = (process.env.FIRST_ADMIN_EMAIL || '').trim().toLowerCase()

// Profile API (DynamoDB only) – requires auth via session or Bearer token
app.get('/api/profile', async (req, res) => {
  const who = await getUserIdAndEmail(req)
  if (!who?.userId) return res.status(401).json({ error: 'Not authenticated' })
  const { userId, email: tokenEmail } = who
  if (!PROFILES_TABLE) return res.status(503).json({ error: 'Profile storage not configured. Set PROFILES_TABLE in .env.' })
  res.setHeader('Cache-Control', 'no-store')
  try {
    const { Item } = await docClient.send(new GetCommand({
      TableName: PROFILES_TABLE,
      Key: { userId },
    }))
    let profile = Item?.profile ?? {}
    if (FIRST_ADMIN_EMAIL && !profile.isAdmin) {
      const profileEmail = (profile.email || '').trim().toLowerCase()
      const matches = profileEmail === FIRST_ADMIN_EMAIL || tokenEmail === FIRST_ADMIN_EMAIL
      if (matches) {
        profile = { ...profile, isAdmin: true }
        if (!profile.email && tokenEmail) profile.email = tokenEmail
        await docClient.send(new PutCommand({
          TableName: PROFILES_TABLE,
          Item: {
            userId,
            profile,
            updatedAt: new Date().toISOString(),
          },
        }))
      }
    }
    return res.json(profile)
  } catch (err) {
    console.error('Profile GET error:', err)
    return res.status(500).json({ error: 'Failed to load profile', message: err.message })
  }
})

app.put('/api/profile', express.json(), async (req, res) => {
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })
  if (!PROFILES_TABLE) return res.status(503).json({ error: 'Profile storage not configured. Set PROFILES_TABLE in .env.' })
  res.setHeader('Cache-Control', 'no-store')
  const incoming = req.body || {}
  try {
    const { Item } = await docClient.send(new GetCommand({
      TableName: PROFILES_TABLE,
      Key: { userId },
    }))
    const existingProfile = Item?.profile || {}
    const isAdmin = existingProfile.isAdmin === true ? (incoming.isAdmin !== false) : false
    const profile = { ...existingProfile, ...incoming, isAdmin }
    await docClient.send(new PutCommand({
      TableName: PROFILES_TABLE,
      Item: {
        userId,
        profile,
        updatedAt: new Date().toISOString(),
      },
    }))
    return res.json(profile)
  } catch (err) {
    console.error('Profile PUT error:', err)
    return res.status(500).json({ error: 'Failed to save profile', message: err.message })
  }
})

/** Require authenticated user with isAdmin in profile. Call after getUserId. */
async function requireAdmin(req, res, next) {
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })
  if (!PROFILES_TABLE) return res.status(503).json({ error: 'Profile storage not configured.' })
  try {
    const { Item } = await docClient.send(new GetCommand({
      TableName: PROFILES_TABLE,
      Key: { userId },
    }))
    if (Item?.profile?.isAdmin !== true) {
      return res.status(403).json({ error: 'Admin access required' })
    }
    req.adminUserId = userId
    next()
  } catch (err) {
    console.error('Admin check error:', err)
    return res.status(500).json({ error: 'Failed to verify admin', message: err.message })
  }
}

// Log client error (authenticated users only)
app.post('/api/errors', express.json(), async (req, res) => {
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })
  if (!ERRORS_TABLE) return res.status(503).json({ error: 'Error logging not configured.' })
  const { message, stack, url, context } = req.body || {}
  if (!message) return res.status(400).json({ error: 'message is required' })
  const id = `err-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  try {
    await docClient.send(new PutCommand({
      TableName: ERRORS_TABLE,
      Item: {
        id,
        userId: userId || null,
        message: String(message).slice(0, 2000),
        stack: stack ? String(stack).slice(0, 4000) : null,
        url: url || null,
        context: context && typeof context === 'object' ? context : null,
        createdAt: new Date().toISOString(),
      },
    }))
    return res.status(201).json({ id })
  } catch (err) {
    console.error('Error log write:', err)
    return res.status(500).json({ error: 'Failed to log error', message: err.message })
  }
})

// Admin: stats (user counts by plan, total applications)
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    let totalUsers = 0
    let freeUsers = 0
    let paidUsers = 0
    if (PROFILES_TABLE) {
      const { Items } = await docClient.send(new ScanCommand({ TableName: PROFILES_TABLE }))
      totalUsers = Items?.length ?? 0
      for (const row of Items || []) {
        const plan = row?.profile?.plan
        if (plan === 'pro') paidUsers += 1
        else freeUsers += 1
      }
    }
    let totalApplications = 0
    if (APPLICATIONS_TABLE) {
      const { Items } = await docClient.send(new ScanCommand({ TableName: APPLICATIONS_TABLE }))
      totalApplications = Items?.length ?? 0
    }
    return res.json({
      users: { total: totalUsers, free: freeUsers, paid: paidUsers },
      applications: { total: totalApplications },
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return res.status(500).json({ error: 'Failed to load stats', message: err.message })
  }
})

// Admin: list recent errors
app.get('/api/admin/errors', requireAdmin, async (req, res) => {
  if (!ERRORS_TABLE) return res.status(503).json({ error: 'Error tracking not configured.' })
  try {
    const { Items } = await docClient.send(new ScanCommand({
      TableName: ERRORS_TABLE,
      Limit: 100,
    }))
    const list = (Items || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    return res.json(list)
  } catch (err) {
    console.error('Admin errors list:', err)
    return res.status(500).json({ error: 'Failed to load errors', message: err.message })
  }
})

// Admin: promote user to admin by email (look up profile by profile.email)
app.post('/api/admin/promote', express.json(), requireAdmin, async (req, res) => {
  if (!PROFILES_TABLE) return res.status(503).json({ error: 'Profile storage not configured.' })
  const email = (req.body?.email || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'Email is required' })
  try {
    const { Items } = await docClient.send(new ScanCommand({ TableName: PROFILES_TABLE }))
    const row = (Items || []).find(
      (r) => (r?.profile?.email || '').trim().toLowerCase() === email
    )
    if (!row?.userId) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No profile found with that email. The user must sign in and complete About You at least once.',
      })
    }
    const profile = { ...(row.profile || {}), isAdmin: true }
    await docClient.send(new PutCommand({
      TableName: PROFILES_TABLE,
      Item: {
        userId: row.userId,
        profile,
        updatedAt: new Date().toISOString(),
      },
    }))
    return res.json({ ok: true, email, userId: row.userId })
  } catch (err) {
    console.error('Admin promote error:', err)
    return res.status(500).json({ error: 'Failed to promote user', message: err.message })
  }
})

// Proxy scholarship/application API to Lambda when API_BACKEND_URL is set (avoids CORS, use VITE_API_URL=/api in frontend)
app.use('/api', express.json())
app.all('/api/*', (req, res, next) => {
  if (req.path === '/api/me' || req.path === '/api/profile') return next()
  if (req.path.startsWith('/api/admin') || req.path === '/api/errors') return next()
  if (!API_BACKEND_URL || API_BACKEND_URL.includes('YOUR-API-ID')) {
    return res.status(503).json({ error: 'API not configured. Set API_BACKEND_URL or VITE_API_URL in .env to your Lambda API URL.' })
  }
  const backendPath = req.path.replace(/^\/api/, '')
  const url = `${API_BACKEND_URL.replace(/\/$/, '')}${backendPath}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`
  const fwdUrl = new URL(API_BACKEND_URL)
  const headers = {
    'content-type': req.headers['content-type'] || 'application/json',
    'accept': req.headers['accept'] || 'application/json',
    'host': fwdUrl.host,
  }
  if (req.headers.authorization) headers['authorization'] = req.headers['authorization']
  fetch(url, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  })
    .then((backRes) => {
      res.status(backRes.status)
      backRes.headers.forEach((v, k) => res.setHeader(k, v))
      return backRes.text()
    })
    .then((text) => res.send(text))
    .catch((err) => {
      console.error('API proxy error:', err)
      res.status(502).json({ error: 'Failed to reach API', message: err.message })
    })
})

app.get('/login', (req, res) => {
  if (!client) {
    return res.status(503).send('Cognito OIDC is not configured. Set COGNITO_ISSUER_URL and COGNITO_CLIENT_ID.')
  }
  const nonce = generators.nonce()
  const state = generators.state()

  req.session.nonce = nonce
  req.session.state = state

  const authUrl = client.authorizationUrl({
    scope: 'openid email',
    state,
    nonce,
  })

  res.redirect(authUrl)
})

function getPathFromURL(urlString) {
  try {
    const url = new URL(urlString)
    return url.pathname
  } catch (error) {
    console.error('Invalid URL:', error)
    return null
  }
}

const callbackPath = getPathFromURL(COGNITO_CALLBACK_URL) || '/callback'

app.get(callbackPath, async (req, res) => {
  if (!client) {
    return res.redirect('/')
  }
  // If Cognito sent an error (e.g. redirect_uri_mismatch), show it instead of crashing
  if (req.query.error) {
    console.error('Cognito callback error:', req.query.error, req.query.error_description)
    return res.status(400).send(
      `<h2>Login error</h2><p><strong>${req.query.error}</strong></p><p>${req.query.error_description || ''}</p><p><a href="/">Back to home</a></p>`
    )
  }
  try {
    const params = client.callbackParams(req)
    const tokenSet = await client.callback(COGNITO_CALLBACK_URL, params, {
      nonce: req.session.nonce,
      state: req.session.state,
    })

    const userInfo = await client.userinfo(tokenSet.access_token)
    req.session.userInfo = userInfo

    res.redirect('/')
  } catch (err) {
    console.error('Callback error:', err)
    res.status(500).send(
      `<h2>Callback failed</h2><pre>${err.message}</pre><p><a href="/">Back to home</a></p>`
    )
  }
})

app.get('/logout', (req, res) => {
  req.session.destroy(() => {})
  if (!COGNITO_LOGOUT_DOMAIN || !COGNITO_CLIENT_ID) {
    return res.redirect('/')
  }
  const logoutUri = process.env.COGNITO_LOGOUT_URI || `${COGNITO_CALLBACK_URL.replace(/\/[^/]*$/, '')}/`
  const logoutUrl = `${COGNITO_LOGOUT_DOMAIN.replace(/\/$/, '')}/logout?client_id=${encodeURIComponent(COGNITO_CLIENT_ID)}&logout_uri=${encodeURIComponent(logoutUri)}`
  res.redirect(logoutUrl)
})

// Serve built Vue app (run npm run build first)
const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath, { index: false }))
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Cognito OIDC server running on http://localhost:${PORT}`)
  if (client) {
    console.log(`Login: http://localhost:${PORT}/login`)
  }
  if (!PROFILES_TABLE) {
    console.warn('PROFILES_TABLE is not set – About You will not save. Set PROFILES_TABLE in .env and ensure AWS credentials are configured.')
  } else {
    console.log(`Profile storage: DynamoDB table "${PROFILES_TABLE}"`)
  }
})
