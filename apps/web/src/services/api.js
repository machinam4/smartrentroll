import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// Rate limiting for refresh requests
let refreshPromise = null
let lastRefreshTime = 0
const REFRESH_COOLDOWN = 5000 // 5 seconds

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only retry if it's not a refresh request and we haven't already retried
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/refresh')) {
      
      originalRequest._retry = true

      try {
        // Rate limit refresh requests
        const now = Date.now()
        if (now - lastRefreshTime < REFRESH_COOLDOWN) {
          // If we're in cooldown, wait for existing refresh or redirect
          if (refreshPromise) {
            await refreshPromise
          } else {
            localStorage.removeItem('accessToken')
            window.location.href = '/login'
            return Promise.reject(error)
          }
        }

        // Start new refresh request
        refreshPromise = api.post('/auth/refresh')
        lastRefreshTime = now
        
        const response = await refreshPromise
        const { accessToken } = response.data
        localStorage.setItem('accessToken', accessToken)
        
        // Clear the promise
        refreshPromise = null
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Clear the promise on error
        refreshPromise = null
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/password', data),
}

// Buildings API
export const buildingsAPI = {
  getAll: () => api.get('/buildings'),
  getById: (id) => api.get(`/buildings/${id}`),
  create: (data) => api.post('/buildings', data),
  update: (id, data) => api.put(`/buildings/${id}`, data),
  delete: (id) => api.delete(`/buildings/${id}`),
  getPremises: (id) => api.get(`/buildings/${id}/premises`),
  getMeters: (id) => api.get(`/buildings/${id}/meters`),
  getSettings: (id) => api.get(`/buildings/${id}/settings`),
  updateSettings: (id, data) => api.put(`/buildings/${id}/settings`, data),
}

// Premises API
export const premisesAPI = {
  getAll: () => api.get('/premises'),
  getById: (id) => api.get(`/premises/${id}`),
  create: (data) => api.post('/premises', data),
  update: (id, data) => api.put(`/premises/${id}`, data),
}

// Readings API
export const readingsAPI = {
  getAll: (params) => api.get('/readings', { params }),
  getById: (id) => api.get(`/readings/${id}`),
  create: (data) => api.post('/readings', data),
  update: (id, data) => api.put(`/readings/${id}`, data),
  delete: (id) => api.delete(`/readings/${id}`),
  getByMeter: (meterId, params) => api.get(`/readings/meter/${meterId}`, { params }),
  getByPeriod: (period, params) => api.get(`/readings/period/${period}`, { params }),
}

// Invoices API
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  generatePreview: (data) => api.post('/invoices/preview', data),
  generate: () => api.post('/invoices/generate'),
  generateSingle: (premiseId, data) => api.post(`/invoices/generate/${premiseId}`, data),
  recalculatePenalty: (id) => api.post(`/invoices/${id}/recalculate-penalty`),
  getReceipt: (id) => api.get(`/invoices/${id}/receipt`),
}

// Payments API
export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
}

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getByBuilding: (buildingId) => api.get(`/users/building/${buildingId}`),
}

// Reports API
export const reportsAPI = {
  getOverview: (params) => api.get('/reports/overview', { params }),
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getUsage: (params) => api.get('/reports/usage', { params }),
  getPayments: (params) => api.get('/reports/payments', { params }),
  getWaterReport: (buildingId, params) => api.get(`/reports/water/${buildingId}`, { params }),
  getRevenueReport: (buildingId, params) => api.get(`/reports/revenue/${buildingId}`, { params }),
}

// Settings API
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
}

// Meters API
export const metersAPI = {
  getAll: (params) => api.get('/meters', { params }),
  getById: (id) => api.get(`/meters/${id}`),
  create: (data) => api.post('/meters', data),
  update: (id, data) => api.put(`/meters/${id}`, data),
  delete: (id) => api.delete(`/meters/${id}`),
}


export default api
