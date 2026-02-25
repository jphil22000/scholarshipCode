/**
 * Fetches published scholarships from ScholarshipOwl For Business API.
 * Set SCHOLARSHIPOWL_API_KEY (Lambda env) to enable.
 * Coverage: depends on scholarships published via the platform (global).
 * Docs: https://docs.business.scholarshipowl.com/api/scholarships.html
 */
import axios from 'axios'

const BASE = 'https://api.business.scholarshipowl.com'
const PAGE_SIZE = 100

export async function fetchScholarshipOwl(apiKey) {
  if (!apiKey || !apiKey.trim()) return []
  const items = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const { data } = await axios.get(`${BASE}/api/scholarship`, {
      timeout: 20000,
      headers: { 'SCHOLARSHIP-APP-API-Key': apiKey.trim() },
      params: { 'page[number]': page, 'page[size]': PAGE_SIZE },
    })
    const list = data?.data || []
    for (const node of list) {
      const att = node.attributes || {}
      const id = node.id
      if (!id) continue
      items.push({
        id: `owl-${id}`,
        title: att.title || 'Untitled',
        description: att.description || '',
        amount: att.amount ?? null,
        deadline: att.deadline ? att.deadline.slice(0, 10) : null,
        source: 'ScholarshipOwl',
        type: 'merit',
        eligibility: '',
        applicationUrl: att.applicationUrl || (node.links?.self ? `${BASE}${node.links.self}` : ''),
      })
    }
    hasMore = list.length === PAGE_SIZE
    page += 1
  }
  return items
}
