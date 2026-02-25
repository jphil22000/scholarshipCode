// Simple local development server for testing without AWS
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Mock scholarship search endpoint
app.post('/api/scholarships/search', async (req, res) => {
  try {
    const { query, filters = {} } = req.body

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' })
    }

    // For development, return mock data
    // In production, this would call the actual search functions
    const mockScholarships = [
      {
        id: '1',
        title: `${query} Scholarship Program`,
        description: `A merit-based scholarship for students interested in ${query}. This scholarship provides financial assistance to deserving students.`,
        amount: 5000,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'merit',
        eligibility: 'Must be enrolled in an accredited college or university',
        source: 'Mock Source'
      },
      {
        id: '2',
        title: `Excellence in ${query} Award`,
        description: `Recognizing outstanding achievement in ${query} studies.`,
        amount: 10000,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'merit',
        eligibility: 'GPA 3.5 or higher',
        source: 'Mock Source'
      },
      {
        id: '3',
        title: `${query} Need-Based Grant`,
        description: `Financial assistance for students with demonstrated need studying ${query}.`,
        amount: 2500,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'need',
        eligibility: 'Demonstrated financial need',
        source: 'Mock Source'
      }
    ]

    // Apply filters
    let filtered = mockScholarships
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

    if (filters.type) {
      filtered = filtered.filter(s => 
        s.type && s.type.toLowerCase().includes(filters.type.toLowerCase())
      )
    }

    res.json({ scholarships: filtered, count: filtered.length })
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ error: 'Failed to search scholarships', message: error.message })
  }
})

// Get scholarship details
app.get('/api/scholarships/:id', (req, res) => {
  const { id } = req.params
  res.json({
    id,
    title: 'Sample Scholarship',
    description: 'Detailed description of the scholarship',
    amount: 5000,
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'merit',
    eligibility: 'Must be enrolled in an accredited college or university',
    requirements: ['GPA 3.0 or higher', 'Full-time student', 'US citizen or permanent resident'],
    applicationUrl: 'https://example.com/apply',
    source: 'Sample Source'
  })
})

// In-memory storage for applications (use DynamoDB in production)
const applications = []

// Get all applications
app.get('/api/applications', (req, res) => {
  res.json(applications)
})

// Create application
app.post('/api/applications', (req, res) => {
  const application = {
    id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  applications.push(application)
  res.status(201).json(application)
})

// Update application
app.put('/api/applications/:id', (req, res) => {
  const { id } = req.params
  const index = applications.findIndex(app => app.id === id)
  
  if (index === -1) {
    return res.status(404).json({ error: 'Application not found' })
  }

  applications[index] = {
    ...applications[index],
    ...req.body,
    id,
    updatedAt: new Date().toISOString()
  }
  
  res.json(applications[index])
})

// Delete application
app.delete('/api/applications/:id', (req, res) => {
  const { id } = req.params
  const index = applications.findIndex(app => app.id === id)
  
  if (index === -1) {
    return res.status(404).json({ error: 'Application not found' })
  }

  applications.splice(index, 1)
  res.json({ message: 'Application deleted successfully' })
})

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`)
  console.log(`📝 API endpoints available at http://localhost:${PORT}/api`)
})
