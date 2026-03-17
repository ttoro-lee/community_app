import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as loginApi, register as registerApi, getMe } from '../api/auth'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await loginApi({ username, password })
    const { access_token, user: userData } = res.data
    localStorage.setItem('access_token', access_token)
    setUser(userData)
    toast.success(`환영합니다, ${userData.nickname}님!`)
    return userData
  }, [])

  const register = useCallback(async (data) => {
    const res = await registerApi(data)
    toast.success('회원가입이 완료되었습니다!')
    return res.data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    setUser(null)
    toast.success('로그아웃 되었습니다.')
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
