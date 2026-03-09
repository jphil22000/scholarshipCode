import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import * as jose from 'jose'

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const CORS_HEADERS_BASE = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS'
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

/** Get userId and email from Bearer JWT. Returns { userId, email } or null if invalid/missing. */
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
    const userId = payload.sub || null
    const email = (payload.email || payload['cognito:username'] || '').toString().trim().toLowerCase()
    return userId ? { userId, email } : null
  } catch {
    return null
  }
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
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' }
  }

  const tableName = process.env.PROFILES_TABLE
  if (!tableName) {
    return jsonResponse(503, { error: 'Profile storage not configured' }, cors)
  }

  const auth = await getAuth(event)
  if (!auth) {
    return jsonResponse(401, { error: 'Not authenticated' }, cors)
  }
  const { userId, email: tokenEmail } = auth

  try {
    if (event.httpMethod === 'GET') {
      const { Item } = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { userId }
      }))
      let profile = Item?.profile ?? {}
      const firstAdminEmail = (process.env.FIRST_ADMIN_EMAIL || '').trim().toLowerCase()
      if (firstAdminEmail && !profile.isAdmin) {
        const profileEmail = (profile.email || '').trim().toLowerCase()
        const matches = profileEmail === firstAdminEmail || tokenEmail === firstAdminEmail
        if (matches) {
          profile = { ...profile, isAdmin: true }
          await docClient.send(new PutCommand({
            TableName: tableName,
            Item: {
              userId,
              profile,
              updatedAt: new Date().toISOString()
            }
          }))
        }
      }
      return jsonResponse(200, profile, cors, { 'Cache-Control': 'no-store' })
    }

    if (event.httpMethod === 'PUT') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {})
      const { Item } = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { userId }
      }))
      const existing = Item?.profile || {}
      const isAdmin = existing.isAdmin === true ? (body.isAdmin !== false) : false
      const profile = { ...existing, ...body, isAdmin }
      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: {
          userId,
          profile,
          updatedAt: new Date().toISOString()
        }
      }))
      return jsonResponse(200, profile, cors, { 'Cache-Control': 'no-store' })
    }

    return jsonResponse(405, { error: 'Method not allowed' }, cors)
  } catch (err) {
    console.error('Profile handler error:', err)
    return jsonResponse(500, { error: 'Failed to process profile', message: err.message }, cors)
  }
}
