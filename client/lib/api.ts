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
    // A 401 only means "your session died" when the request actually carried a
    // token. An anonymous login/OTP-verify attempt also 401s on bad credentials,
    // but that's a normal failure the calling screen already handles inline, so
    // force-logging out and hard-redirecting would yank the user out of an
    // in-app flow (e.g. the OTP verify screen) into the website's /signin page.
    const hadToken = Boolean(error.config?.headers?.Authorization)
    if (error.response?.status === 401 && hadToken && typeof window !== "undefined") {
      const isAuthPage = window.location.pathname === "/signin" || window.location.pathname === "/signup"

      if (!isAuthPage) {
        useAuthStore.getState().clearAuth()
        window.location.assign("/signin")
      }
    }
    return Promise.reject(error)
  }
)

export default api
