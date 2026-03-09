import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import * as jose from 'jose'

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const CORS_HEADERS_BASE = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
}

function getCorsHeaders(event) {
  const h = event.headers || {}
  const originKey = Object.keys(h).find((k) => k.toLowerCase() === 'origin')
  const origin = originKey ? h[originKey] : null
  if (origin && typeof origin === 'string' && (origin.startsWith('https://') || origin.startsWith('http://localhost'))) {
    return {
      ...CORS_HEADERS_BASE,
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true'
    }
  }
  return {
    ...CORS_HEADERS_BASE,
    'Access-Control-Allow-Origin': '*'
  }
}

let cognitoJwks = null
function getJwks() {
  const issuerUrl = process.env.COGNITO_ISSUER_URL
  if (!issuerUrl) return null
  if (!cognitoJwks) {
    const jwksUrl = `${issuerUrl.replace(/\/$/, '')}/.well-known/jwks.json`
    cognitoJwks = jose.createRemoteJWKSet(new URL(jwksUrl))
  }
  return cognitoJwks
}

async function getAuth(event) {
  const h = event.headers || {}
  const authKey = Object.keys(h).find((k) => k.toLowerCase() === 'authorization')
  const auth = h.Authorization || h.authorization || (authKey ? h[authKey] : null)
  if (!auth || !String(auth).startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const jwks = getJwks()
  const issuer = process.env.COGNITO_ISSUER_URL
  const audiences = [process.env.COGNITO_CLIENT_ID, process.env.COGNITO_HOSTED_UI_CLIENT_ID].filter(Boolean)
  if (!jwks || !issuer || audiences.length === 0) return null
  try {
    const { payload } = await jose.jwtVerify(token, jwks, { issuer, audience: audiences })
    return payload.sub ? { userId: payload.sub } : null
  } catch {
    return null
  }
}

async function requireAdmin(event) {
  const auth = await getAuth(event)
  if (!auth) return { allowed: false, statusCode: 401, error: 'Not authenticated' }
  const profilesTable = process.env.PROFILES_TABLE
  if (!profilesTable) return { allowed: false, statusCode: 503, error: 'Profile storage not configured' }
  const { Item } = await docClient.send(new GetCommand({
    TableName: profilesTable,
    Key: { userId: auth.userId }
  }))
  if (Item?.profile?.isAdmin !== true) {
    return { allowed: false, statusCode: 403, error: 'Admin access required' }
  }
  return { allowed: true, userId: auth.userId }
}

function jsonResponse(statusCode, body, corsHeaders, extraHeaders = {}) {
  const cors = corsHeaders || getCorsHeaders({ headers: {} })
  return {
    statusCode,
    headers: { ...cors, 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body)
  }
}

export const handler = async (event) => {
  const cors = getCorsHeaders(event)
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' }
  }

  const path = event.rawPath || event.path || ''
  const method = event.requestContext?.http?.method || event.httpMethod || ''

  const profilesTable = process.env.PROFILES_TABLE
  const applicationsTable = process.env.APPLICATIONS_TABLE || ''
  const errorsTable = process.env.ERRORS_TABLE || ''

  // GET /admin/stats
  if ((path.endsWith('/admin/stats') || path === '/admin/stats') && method === 'GET') {
    const admin = await requireAdmin(event)
    if (!admin.allowed) {
      return jsonResponse(admin.statusCode, { error: admin.error }, cors)
    }
    try {
      let totalUsers = 0, freeUsers = 0, paidUsers = 0
      if (profilesTable) {
        const { Items } = await docClient.send(new ScanCommand({ TableName: profilesTable }))
        totalUsers = Items?.length ?? 0
        for (const row of Items || []) {
          if (row?.profile?.plan === 'pro') paidUsers += 1
          else freeUsers += 1
        }
      }
      let totalApplications = 0
      if (applicationsTable) {
        const { Items } = await docClient.send(new ScanCommand({ TableName: applicationsTable }))
        totalApplications = Items?.length ?? 0
      }
      return jsonResponse(200, {
        users: { total: totalUsers, free: freeUsers, paid: paidUsers },
        applications: { total: totalApplications }
      }, cors)
    } catch (err) {
      console.error('Admin stats error:', err)
      return jsonResponse(500, { error: 'Failed to load stats', message: err.message }, cors)
    }
  }

  // GET /admin/errors
  if ((path.endsWith('/admin/errors') || path === '/admin/errors') && method === 'GET') {
    const admin = await requireAdmin(event)
    if (!admin.allowed) {
      return jsonResponse(admin.statusCode, { error: admin.error }, cors)
    }
    if (!errorsTable) {
      return jsonResponse(503, { error: 'Error tracking not configured' }, cors)
    }
    try {
      const { Items } = await docClient.send(new ScanCommand({
        TableName: errorsTable,
        Limit: 100
      }))
      const list = (Items || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      return jsonResponse(200, list, cors)
    } catch (err) {
      console.error('Admin errors list:', err)
      return jsonResponse(500, { error: 'Failed to load errors', message: err.message }, cors)
    }
  }

  // POST /admin/promote
  if ((path.endsWith('/admin/promote') || path === '/admin/promote') && method === 'POST') {
    const admin = await requireAdmin(event)
    if (!admin.allowed) {
      return jsonResponse(admin.statusCode, { error: admin.error }, cors)
    }
    if (!profilesTable) {
      return jsonResponse(503, { error: 'Profile storage not configured' }, cors)
    }
    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {})
    const email = (body.email || '').trim().toLowerCase()
    if (!email) {
      return jsonResponse(400, { error: 'Email is required' }, cors)
    }
    try {
      const { Items } = await docClient.send(new ScanCommand({ TableName: profilesTable }))
      const row = (Items || []).find(
        (r) => (r?.profile?.email || '').trim().toLowerCase() === email
      )
      if (!row?.userId) {
        return jsonResponse(404, {
          error: 'User not found',
          message: 'No profile found with that email. The user must sign in and complete About You at least once.'
        }, cors)
      }
      const profile = { ...(row.profile || {}), isAdmin: true }
      await docClient.send(new PutCommand({
        TableName: profilesTable,
        Item: {
          userId: row.userId,
          profile,
          updatedAt: new Date().toISOString()
        }
      }))
      return jsonResponse(200, { ok: true, email, userId: row.userId }, cors)
    } catch (err) {
      console.error('Admin promote error:', err)
      return jsonResponse(500, { error: 'Failed to promote user', message: err.message }, cors)
    }
  }

  return jsonResponse(404, { error: 'Not found' }, cors)
}
