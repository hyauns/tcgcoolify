"use client"

/**
 * auth-context.tsx — public entry point for auth state.
 *
 * The real Context + Provider + hook live in `@/hooks/use-auth`. This file
 * re-exports them so existing imports (`from "@/lib/auth-context"`) continue
 * to resolve. Both `<AuthProvider>` here and in `@/hooks/use-auth` are the
 * same component — there is no longer any no-op shim.
 *
 * Account-page-specific value types (Address, Order, OrderItem) also live
 * here for historical reasons and remain unchanged.
 */

export { AuthProvider, useAuth } from "@/hooks/use-auth"
export type { User, AuthState } from "@/hooks/use-auth"

// ── Account/order value types kept here for backward-compatible imports ────

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
}

export interface Order {
  id: string
  orderNumber: string
  date: string
  status: "pending" | "processing" | "shipped" | "delivered"
  total: number
  trackingNumber?: string
  items: OrderItem[]
}

export interface Address {
  id: string
  type: "shipping" | "billing"
  firstName: string
  lastName: string
  company?: string
  address1: string
  address2?: string
  city: string
  state: string
  zipCode: string
  country: string
  phone?: string
  isDefault: boolean
}
