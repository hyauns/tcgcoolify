"use client"

/**
 * Auth Context — single source of truth for the client-side session.
 *
 * One AuthProvider wraps the app at `app/providers.tsx`. It calls
 * /api/auth/session exactly once per mount (guarded against React 18
 * StrictMode double-invoke) and exposes the same state + actions to
 * every consumer via `useAuth()`. Previously, each `useAuth()` call
 * ran its own fetch + held its own local state, so a single page load
 * fired 5–10 /api/auth/session requests and `login()` only updated the
 * caller's component (Header wouldn't refresh until next mount).
 *
 * Public API is unchanged from the prior standalone-hook version, so
 * consumers (`Header`, `account/page`, `admin/layout`, `checkout/page`,
 * `auth/login`, etc.) do not need to be touched.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type React from "react"
import { useRouter } from "next/navigation"

// ── Public types ────────────────────────────────────────────────────────────

export interface User {
  user_id: string
  email: string
  first_name: string
  last_name: string
  role: "user" | "admin"
  email_verified: boolean
  created_at: string
  // Commerce fields — populated via the customers table JOIN in /api/auth/session
  customer_id: string | null
  total_orders: number
  total_spent: number
  last_order_date: string | null
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

interface RegisterPayload {
  email: string
  password: string
  firstName: string
  lastName: string
}

interface AuthContextValue extends AuthState {
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{ success: boolean; user?: User; error?: string }>
  register: (
    userData: RegisterPayload,
  ) => Promise<{ success: boolean; message?: string; error?: string }>
  logout: () => Promise<void>
  forgotPassword: (
    email: string,
  ) => Promise<{ success: boolean; message?: string }>
  resetPassword: (
    token: string,
    newPassword: string,
  ) => Promise<{ success: boolean; message?: string; error?: string }>
  validateResetToken: (
    token: string,
  ) => Promise<{ valid: boolean; email?: string; error?: string }>
  checkSession: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })
  const router = useRouter()

  // StrictMode runs effects twice in dev. `initRef` ensures we only kick off
  // the initial session fetch on the first effect pass per real mount.
  const initRef = useRef(false)

  // If two callers somehow race (e.g. a manual `checkSession()` while the
  // initial one is still in flight) they share the same network request.
  const inflightSessionRef = useRef<Promise<void> | null>(null)

  const checkSession = useCallback(async (): Promise<void> => {
    if (inflightSessionRef.current) {
      return inflightSessionRef.current
    }

    const p = (async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        })
        if (response.ok) {
          const data = await response.json()
          setState({ user: data.user, loading: false, error: null })
        } else {
          // 401 = not logged in. Treat as expected; do not log as an error.
          setState({ user: null, loading: false, error: null })
        }
      } catch {
        setState({ user: null, loading: false, error: "Session check failed" })
      } finally {
        inflightSessionRef.current = null
      }
    })()

    inflightSessionRef.current = p
    return p
  }, [])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    void checkSession()
  }, [checkSession])

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password, rememberMe }),
        })

        const data = await response.json()

        if (response.ok) {
          setState({ user: data.user, loading: false, error: null })
          return { success: true, user: data.user as User }
        } else {
          setState((prev) => ({ ...prev, loading: false, error: data.error }))
          return { success: false, error: data.error }
        }
      } catch {
        const errorMessage = "Login failed. Please try again."
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }))
        return { success: false, error: errorMessage }
      }
    },
    [],
  )

  const register = useCallback(async (userData: RegisterPayload) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (response.ok) {
        setState((prev) => ({ ...prev, loading: false, error: null }))
        return { success: true, message: data.message }
      } else {
        setState((prev) => ({ ...prev, loading: false, error: data.error }))
        return { success: false, error: data.error }
      }
    } catch {
      const errorMessage = "Registration failed. Please try again."
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      setState({ user: null, loading: false, error: null })
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      // Still clear local state so the UI does not pretend the user is logged in
      setState({ user: null, loading: false, error: null })
    }
  }, [router])

  const forgotPassword = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      setState((prev) => ({ ...prev, loading: false }))

      return {
        success: response.ok,
        message: data.message || data.error,
      }
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: "Request failed" }))
      return { success: false, message: "Request failed. Please try again." }
    }
  }, [])

  const resetPassword = useCallback(
    async (token: string, newPassword: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: newPassword }),
        })

        const data = await response.json()

        if (response.ok) {
          setState((prev) => ({ ...prev, loading: false, error: null }))
          return { success: true, message: data.message }
        } else {
          setState((prev) => ({ ...prev, loading: false, error: data.error }))
          return { success: false, error: data.error }
        }
      } catch {
        const errorMessage = "Password reset failed. Please try again."
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }))
        return { success: false, error: errorMessage }
      }
    },
    [],
  )

  const validateResetToken = useCallback(async (token: string) => {
    try {
      const response = await fetch(
        `/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`,
      )
      if (response.ok) {
        const data = await response.json()
        return { valid: data.valid as boolean, email: data.email as string | undefined }
      } else {
        const data = await response.json()
        return { valid: false, error: (data.error as string) || "Invalid token" }
      }
    } catch {
      return { valid: false, error: "Failed to validate token" }
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      forgotPassword,
      resetPassword,
      validateResetToken,
      checkSession,
      isAuthenticated: !!state.user,
      isAdmin: state.user?.role === "admin",
    }),
    [
      state,
      login,
      register,
      logout,
      forgotPassword,
      resetPassword,
      validateResetToken,
      checkSession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error(
      "useAuth() must be used inside <AuthProvider>. " +
        "AuthProvider is mounted in app/providers.tsx — make sure your component is rendered within Providers.",
    )
  }
  return ctx
}
