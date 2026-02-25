/**
 * Syncs scholarship data into DynamoDB from multiple sources.
 * - Local: curatedScholarships.json + all JSON files in data/sources/
 * - Optional: SCHOLARSHIP_FEED_URL (comma-separated URLs for JSON arrays)
 * - ScholarshipOwl: set SCHOLARSHIPOWL_API_KEY (REST API, platform-dependent coverage)
 * - Data.gov: set DATA_GOV_API_KEY (US College Scorecard, federal/state aid by school)
 * - ScholarshipAPI (e.g. AU/NZ): set SCHOLARSHIP_API_URL and optionally SCHOLARSHIP_API_KEY
 * - IEFA: no public API — cannot ingest.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import axios from 'axios'
import { fetchScholarshipOwl } from '../sources/scholarshipOwl.js'
import { fetchDataGov } from '../sources/dataGov.js'
import { fetchScholarshipApi } from '../sources/scholarshipApi.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tableName = process.env.SCHOLARSHIPS_TABLE
const FEED_URLS = (process.env.SCHOLARSHIP_FEED_URL || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean)

const client = new DynamoDBClient({})
const doc = DynamoDBDocumentClient.from(client)

function normalize(s, defaultSource = 'Curated') {
  const id = s.id || (s.title && s.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) || `sch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return {
    id,
    title: s.title || 'Untitled',
    description: s.description || '',
    amount: s.amount ?? null,
    deadline: s.deadline || null,
    source: s.source || defaultSource,
    type: s.type || 'merit',
    eligibility: s.eligibility || '',
    applicationUrl: s.applicationUrl || '',
  }
}

function loadLocalJson(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : [data]
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err.message)
    return []
  }
}

function loadAllLocalSources() {
  const items = []
  const curatedPath = join(__dirname, '../data/curatedScholarships.json')
  if (existsSync(curatedPath)) {
    items.push(...loadLocalJson(curatedPath).map((s) => normalize(s, 'Curated')))
  }
  const sourcesDir = join(__dirname, '../data/sources')
  if (existsSync(sourcesDir)) {
    const files = readdirSync(sourcesDir).filter((f) => f.endsWith('.json'))
    for (const file of files) {
      const filePath = join(sourcesDir, file)
      const sourceName = file.replace(/\.json$/i, '').replace(/-/g, ' ')
      items.push(...loadLocalJson(filePath).map((s) => normalize(s, sourceName)))
    }
  }
  return items
}

async function fetchRemoteFeeds() {
  const items = []
  for (const url of FEED_URLS) {
    try {
      const { data } = await axios.get(url, { timeout: 15000 })
      const list = Array.isArray(data) ? data : (data && data.scholarships) ? data.scholarships : []
      items.push(...list.map((s) => normalize(s, new URL(url).hostname)))
    } catch (err) {
      console.warn(`Failed to fetch feed ${url}:`, err.message)
    }
  }
  return items
}

async function fetchFromApis() {
  const items = []
  try {
    const owl = await fetchScholarshipOwl(process.env.SCHOLARSHIPOWL_API_KEY)
    items.push(...owl.map((s) => normalize(s, 'ScholarshipOwl')))
  } catch (err) {
    console.warn('ScholarshipOwl fetch failed:', err.message)
  }
  try {
    const dataGov = await fetchDataGov(process.env.DATA_GOV_API_KEY)
    items.push(...dataGov.map((s) => normalize(s, 'Data.gov')))
  } catch (err) {
    console.warn('Data.gov fetch failed:', err.message)
  }
  try {
    const api = await fetchScholarshipApi(
      process.env.SCHOLARSHIP_API_URL,
      process.env.SCHOLARSHIP_API_KEY
    )
    items.push(...api.map((s) => normalize(s, 'ScholarshipAPI')))
  } catch (err) {
    console.warn('ScholarshipAPI fetch failed:', err.message)
  }
  return items
}

function dedupeById(items) {
  const seen = new Set()
  return items.filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
}

export const handler = async () => {
  if (!tableName) {
    throw new Error('SCHOLARSHIPS_TABLE not set')
  }

  const local = loadAllLocalSources()
  const remote = await fetchRemoteFeeds()
  const apis = await fetchFromApis()
  const all = dedupeById([...local, ...remote, ...apis])

  const putRequests = all.map((s) => ({
    PutRequest: {
      Item: {
        ...s,
        updatedAt: new Date().toISOString(),
      },
    },
  }))

  const batchSize = 25
  for (let i = 0; i < putRequests.length; i += batchSize) {
    const chunk = putRequests.slice(i, i + batchSize)
    await doc.send(
      new BatchWriteCommand({
        RequestItems: { [tableName]: chunk },
      })
    )
  }

  console.log(`Synced ${all.length} scholarships (local: ${local.length}, remote: ${remote.length}, apis: ${apis.length}) to ${tableName}`)
  return { synced: all.length, fromLocal: local.length, fromRemote: remote.length, fromApis: apis.length }
}
