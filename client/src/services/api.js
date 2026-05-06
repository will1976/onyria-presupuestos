import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  res => res.data,
  async err => {
    const data = err.response?.data
    // When responseType='blob' and server returns a JSON error, data is a Blob
    if (data instanceof Blob && data.type?.includes('json')) {
      try {
        const text = await data.text()
        const json = JSON.parse(text)
        return Promise.reject(new Error(json.error || json.message || err.message))
      } catch { /* fall through */ }
    }
    const message = data?.error || err.message || 'Error de red'
    return Promise.reject(new Error(message))
  }
)

export default api
