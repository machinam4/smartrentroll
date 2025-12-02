import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (token) {
        const response = await authAPI.getProfile()
        setUser(response.data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      // Don't remove token here, let the interceptor handle it
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken')
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials)
      const { user, accessToken } = response.data
      
      localStorage.setItem('accessToken', accessToken)
      setUser(user)
      
      return { success: true, user }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData)
      const { user, accessToken } = response.data
      
      localStorage.setItem('accessToken', accessToken)
      setUser(user)
      
      return { success: true, user }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      }
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      setUser(null)
    }
  }

  const updateProfile = async (data) => {
    try {
      const response = await authAPI.updateProfile(data)
      setUser(response.data.user)
      return { success: true, user: response.data.user }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Update failed' 
      }
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    checkAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
