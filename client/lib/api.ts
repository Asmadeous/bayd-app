import axios from "axios"
import { API_BASE_URL } from "@/lib/config"
import { useAuthStore } from "@/lib/stores/auth-store"

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const requestUrl = error.config?.url ?? ""
      const isAuthRequest = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register")
      const isAuthPage = window.location.pathname === "/signin" || window.location.pathname === "/signup"

      if (!isAuthRequest && !isAuthPage) {
        useAuthStore.getState().clearAuth()
        window.location.assign("/signin")
      }
    }
    return Promise.reject(error)
  }
)

export default api
