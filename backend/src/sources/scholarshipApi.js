/**
 * Fetches scholarships from a generic REST API (e.g. ScholarshipAPI for AU/NZ, or any
 * provider that returns a JSON array or JSON:API list).
 * Set SCHOLARSHIP_API_URL (required) and optionally SCHOLARSHIP_API_KEY (Lambda env).
 * Coverage: depends on provider (e.g. AU, NZ, then CA, US, Europe for ScholarshipAPI).
 */
import axios from 'axios'

export async function fetchScholarshipApi(baseUrl, apiKey) {
  if (!baseUrl || !baseUrl.trim()) return []
  const url = baseUrl.trim().replace(/\/$/, '')
  const headers = {}
  if (apiKey && apiKey.trim()) headers['Authorization'] = `Bearer ${apiKey.trim()}`
  const items = []
  try {
    const { data } = await axios.get(url, { timeout: 20000, headers })
    let list = []
    if (Array.isArray(data)) list = data
    else if (data?.data) list = Array.isArray(data.data) ? data.data : [data.data]
    else if (data?.scholarships) list = data.scholarships
    else list = []
    for (const s of list) {
      const att = s.attributes || s
      items.push({
        id: s.id ? `api-${s.id}` : undefined,
        title: att.title || s.title || 'Untitled',
        description: att.description || s.description || '',
        amount: att.amount ?? s.amount ?? null,
        deadline: att.deadline || s.deadline ? (att.deadline || s.deadline).toString().slice(0, 10) : null,
        source: att.source || s.source || 'External API',
        type: att.type || s.type || 'merit',
        eligibility: att.eligibility || s.eligibility || '',
        applicationUrl: att.applicationUrl || att.application_url || s.applicationUrl || s.application_url || '',
      })
    }
  } catch (err) {
    console.warn('ScholarshipAPI fetch failed:', err.message)
  }
  return items
}
