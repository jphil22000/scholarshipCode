import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const useScholarshipStore = defineStore('scholarship', () => {
  const scholarships = ref([])
  const applications = ref([])
  const loading = ref(false)
  const error = ref(null)

  const searchScholarships = async (query, filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await axios.post(`${API_BASE_URL}/scholarships/search`, {
        query,
        filters
      })
      scholarships.value = response.data.scholarships || []
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('Error searching scholarships:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const searchScholarshipsWithAI = async (query, maxResults = 10) => {
    loading.value = true
    error.value = null
    try {
      const response = await axios.post(`${API_BASE_URL}/scholarships/ai-search`, {
        query: query.trim(),
        maxResults
      })
      scholarships.value = response.data.scholarships || []
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || err.message
      scholarships.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  const getScholarshipDetails = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get(`${API_BASE_URL}/scholarships/${id}`)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const saveApplication = async (applicationData) => {
    loading.value = true
    error.value = null
    try {
      const response = await axios.post(`${API_BASE_URL}/applications`, applicationData)
      applications.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const getApplications = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get(`${API_BASE_URL}/applications`)
      applications.value = response.data || []
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateApplication = async (id, updates) => {
    loading.value = true
    error.value = null
    try {
      const response = await axios.put(`${API_BASE_URL}/applications/${id}`, updates)
      const index = applications.value.findIndex(app => app.id === id)
      if (index !== -1) {
        applications.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteApplication = async (id) => {
    loading.value = true
    error.value = null
    try {
      await axios.delete(`${API_BASE_URL}/applications/${id}`)
      applications.value = applications.value.filter(app => app.id !== id)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    scholarships,
    applications,
    loading,
    error,
    searchScholarships,
    searchScholarshipsWithAI,
    getScholarshipDetails,
    saveApplication,
    getApplications,
    updateApplication,
    deleteApplication
  }
})
