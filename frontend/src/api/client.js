import axios from 'axios'
import toast from 'react-hot-toast'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 / 403 (suspension)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const detail = error.response?.data?.detail

    if (status === 401) {
      // 로그인 페이지 자체에서 발생한 401은 페이지 이동 없이 LoginPage가 직접 처리
      if (window.location.pathname === '/login') {
        return Promise.reject(error)
      }
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      toast.error('세션이 만료되었습니다. 다시 로그인해 주세요.')
      setTimeout(() => { window.location.href = '/login' }, 1000)
      return Promise.reject(error)
    }

    if (status === 403 && detail?.message === '활동이 정지된 계정입니다.') {
      // 로그인 페이지에서는 LoginPage가 직접 처리
      if (window.location.pathname === '/login') {
        return Promise.reject(error)
      }
      const until = detail.suspended_until
        ? new Date(detail.suspended_until).toLocaleString('ko-KR')
        : ''
      const reason = detail.reason ? ` 사유: ${detail.reason}` : ''
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      toast.error(`계정이 정지되었습니다.${until ? ` (${until}까지)` : ''}${reason}`, {
        duration: 5000,
      })
      setTimeout(() => { window.location.href = '/login' }, 1500)
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

export default client
