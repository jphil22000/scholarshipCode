/**
 * AI-powered scholarship search using web search (Tavily) + Amazon Bedrock.
 * Requires: TAVILY_API_KEY, BEDROCK_MODEL_ID (optional, default Claude 3 Haiku).
 * IAM: bedrock:InvokeModel.
 */
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || ''
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0'
const region = process.env.AWS_REGION || 'us-east-1'
const bedrock = new BedrockRuntimeClient({ region })

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    const maxResults = Math.min(Math.max(Number(body.maxResults) || 10, 1), 15)

    if (!query) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'query is required', scholarships: [] }),
      }
    }

    if (!TAVILY_API_KEY) {
      return {
        statusCode: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'AI web search is not configured. Set TAVILY_API_KEY.',
          scholarships: [],
        }),
      }
    }

    const webResults = await searchWeb(query, maxResults)
    const scholarships = await extractScholarshipsWithBedrock(query, webResults)

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scholarships, count: scholarships.length, source: 'ai_web' }),
    }
  } catch (err) {
    console.error('AI search error:', err)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'AI search failed',
        message: err.message,
        scholarships: [],
      }),
    }
  }
}

async function searchWeb(query, maxResults) {
  const searchQuery = `scholarships ${query} 2025 2026 apply`
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query: searchQuery,
      search_depth: 'basic',
      max_results: Math.min(maxResults, 20),
      include_domains: [],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Tavily API error: ${res.status} ${text}`)
  }

  const data = await res.json()
  return (data.results || []).map((r) => ({
    title: r.title || '',
    content: r.content || '',
    url: r.url || '',
  }))
}

async function extractScholarshipsWithBedrock(userQuery, webResults) {
  const searchContext = webResults
    .map(
      (r, i) =>
        `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nContent: ${(r.content || '').slice(0, 800)}`
    )
    .join('\n\n')

  const systemPrompt = `You are a scholarship advisor. Given web search results, extract real scholarship opportunities. Return a JSON array only, no other text. Each object must have: "id" (string, unique, e.g. "ai-1"), "title" (string), "description" (string, brief), "amount" (number or null), "deadline" (YYYY-MM-DD or null), "applicationUrl" (string, use the result URL when relevant), "source" (string, e.g. site name). Omit generic articles or non-scholarship links. If nothing is a real scholarship, return [].`

  const userPrompt = `User search: "${userQuery}"\n\nWeb search results:\n${searchContext}\n\nExtract scholarship opportunities as a JSON array:`

  const response = await bedrock.send(
    new ConverseCommand({
      modelId: BEDROCK_MODEL_ID,
      messages: [
        {
          role: 'user',
          content: [{ text: userPrompt }],
        },
      ],
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.2,
      },
    })
  )

  const text = response.output?.message?.content?.[0]?.text || '[]'
  const parsed = parseJsonArray(text)
  if (!Array.isArray(parsed)) return []
  return parsed.map((s) => ({
    id: s.id || `ai-${Math.random().toString(36).slice(2, 11)}`,
    title: s.title || 'Untitled',
    description: s.description || '',
    amount: s.amount ?? null,
    deadline: s.deadline || null,
    applicationUrl: s.applicationUrl || s.url || '',
    source: s.source || 'Web',
    eligibility: s.eligibility || null,
    type: s.type || null,
  }))
}

function parseJsonArray(text) {
  const trimmed = text.trim()
  const match = trimmed.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      return JSON.parse(match[0])
    } catch {
      // fallback
    }
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    return []
  }
}
