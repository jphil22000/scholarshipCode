import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const tableName = process.env.SCHOLARSHIPS_TABLE
const client = new DynamoDBClient({})
const doc = DynamoDBDocumentClient.from(client)

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { query = '', filters = {} } = body
    const queryStr = typeof query === 'string' ? query.trim() : ''

    const scholarships = await searchScholarships(queryStr, filters)

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scholarships, count: scholarships.length })
    }
  } catch (error) {
    console.error('Error searching scholarships:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to search scholarships',
        message: error.message
      })
    }
  }
}

async function searchScholarships(query, filters) {
  if (!tableName) {
    console.warn('SCHOLARSHIPS_TABLE not set')
    return []
  }

  const items = await scanAll()
  const q = query.toLowerCase()
  let matches = items
  if (q) {
    matches = items.filter((s) => {
      const title = (s.title || '').toLowerCase()
      const desc = (s.description || '').toLowerCase()
      const source = (s.source || '').toLowerCase()
      const elig = (s.eligibility || '').toLowerCase()
      return title.includes(q) || desc.includes(q) || source.includes(q) || elig.includes(q)
    })
  }

  return applyFilters(matches, filters)
}

async function scanAll() {
  const items = []
  let lastKey = null
  do {
    const res = await doc.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastKey ?? undefined
      })
    )
    if (res.Items) items.push(...res.Items)
    lastKey = res.LastEvaluatedKey ?? null
  } while (lastKey)
  return items
}

function applyFilters(scholarships, filters) {
  let filtered = [...scholarships]

  // Filter by amount
  if (filters.amount) {
    const [min, max] = filters.amount.split('-').map(v => {
      if (v.endsWith('+')) {
        return [parseInt(v.replace('+', '').replace(/\D/g, '')), Infinity]
      }
      return parseInt(v.replace(/\D/g, ''))
    })

    filtered = filtered.filter(s => {
      if (!s.amount) return false
      if (Array.isArray(min)) {
        return s.amount >= min[0]
      }
      return s.amount >= min && (!max || s.amount <= max)
    })
  }

  // Filter by deadline
  if (filters.deadline) {
    const days = parseInt(filters.deadline)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    filtered = filtered.filter(s => {
      if (!s.deadline) return false
      const deadline = new Date(s.deadline)
      return deadline <= futureDate
    })
  }

  // Filter by type
  if (filters.type) {
    filtered = filtered.filter(s => 
      s.type && s.type.toLowerCase().includes(filters.type.toLowerCase())
    )
  }

  return filtered
}
