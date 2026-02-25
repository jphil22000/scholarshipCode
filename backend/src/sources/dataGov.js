/**
 * Fetches US school-level financial aid data from Data.gov College Scorecard API.
 * Set DATA_GOV_API_KEY (Lambda env) to enable. Get key: https://api.data.gov/signup
 * Coverage: United States (federal/state aid by institution).
 * We turn each school into a "Financial aid at [School]" scholarship-like record.
 */
import axios from 'axios'

const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools'
const PER_PAGE = 100
const FIELDS = 'id,school.name,school.school_url,latest.aid.pell_grant_rate,latest.aid.median_debt.completers.overall'

export async function fetchDataGov(apiKey) {
  if (!apiKey || !apiKey.trim()) return []
  const items = []
  let page = 0
  let hasMore = true
  while (hasMore) {
    const { data } = await axios.get(BASE, {
      timeout: 20000,
      params: {
        api_key: apiKey.trim(),
        per_page: PER_PAGE,
        page,
        fields: FIELDS,
      },
    })
    const results = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
    for (const row of results) {
      const name = row['school.name'] || row.school?.name || 'Unknown school'
      const id = row.id != null ? String(row.id) : null
      if (!id) continue
      const url = row['school.school_url'] || row.school?.school_url
      const pellRate = row['latest.aid.pell_grant_rate'] ?? row.latest?.aid?.pell_grant_rate
      const medianDebt = row['latest.aid.median_debt.completers.overall'] ?? row.latest?.aid?.median_debt?.completers?.overall
      const desc = [
        pellRate != null && `Pell grant rate: ${(Number(pellRate) * 100).toFixed(0)}%`,
        medianDebt != null && `Median debt (completers): $${Number(medianDebt).toLocaleString()}`,
      ].filter(Boolean).join('. ')
      items.push({
        id: `datagov-${id}`,
        title: `Financial aid at ${name}`,
        description: desc || `Federal and state financial aid available. See College Scorecard for details.`,
        amount: medianDebt != null ? Number(medianDebt) : null,
        deadline: null,
        source: 'Data.gov (College Scorecard)',
        type: 'need',
        eligibility: 'US institution; eligibility varies by program (Pell, loans, etc.).',
        applicationUrl: url || `https://collegescorecard.ed.gov/school/?id=${id}`,
      })
    }
    hasMore = results.length === PER_PAGE
    page += 1
    if (page > 50) break // cap at 5000 schools
  }
  return items
}
