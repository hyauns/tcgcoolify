"use client"

import type React from "react"
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/hooks/use-auth"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItem {
  id: number
  name: string
  price: number
  originalPrice?: number
  image: string
  category: string
  inStock: boolean
  quantity: number
  isPreOrder?: boolean
  preOrderDate?: string
}

interface CartState {
  items: CartItem[]
  itemCount: number
  totalAmount: number
}

type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<CartItem, "quantity"> }
  | { type: "REMOVE_ITEM"; payload: number }
  | { type: "UPDATE_QUANTITY"; payload: { id: number; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] }

// ---------------------------------------------------------------------------
// Reducer (pure — no side effects)
// ---------------------------------------------------------------------------

function recompute(items: CartItem[]): CartState {
  return {
    items,
    itemCount: items.reduce((t, i) => t + i.quantity, 0),
    totalAmount: items.reduce((t, i) => t + i.price * i.quantity, 0),
  }
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const idx = state.items.findIndex((i) => i.id === action.payload.id)
      if (idx >= 0) {
        const items = state.items.map((i, index) =>
          index === idx ? { ...i, quantity: i.quantity + 1 } : i
        )
        return recompute(items)
      }
      return recompute([...state.items, { ...action.payload, quantity: 1 }])
    }
    case "REMOVE_ITEM":
      return recompute(state.items.filter((i) => i.id !== action.payload))
    case "UPDATE_QUANTITY": {
      const items = state.items
        .map((i) =>
          i.id === action.payload.id
            ? { ...i, quantity: Math.max(0, action.payload.quantity) }
            : i
        )
        .filter((i) => i.quantity > 0)
      return recompute(items)
    }
    case "CLEAR_CART":
      return recompute([])
    case "LOAD_CART":
      return recompute(action.payload)
    default:
      return state
  }
}

const initialState: CartState = { items: [], itemCount: 0, totalAmount: 0 }

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface CartContextType {
  state: CartState
  dispatch: React.Dispatch<CartAction>
  getCartCount: () => number
  getTotalAmount: () => number
  clearCart: () => void
  addItemWithAnimation: (item: Omit<CartItem, "quantity">, quantity?: number) => Promise<void>
  isAddingToCart: boolean
  recentlyAddedItem: number | null
  showAddToCartPopup: boolean
  addToCartPopupProduct: {
    id: number
    name: string
    price: number
    originalPrice?: number
    image: string
    category: string
    quantity?: number
  } | null
  closeAddToCartPopup: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// ---------------------------------------------------------------------------
// API helpers (fire-and-forget — never block the UI)
// ---------------------------------------------------------------------------

async function apiAdd(productId: number, quantity: number) {
  try {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId, quantity }),
    })
  } catch { /* silent */ }
}

async function apiSetQuantity(productId: number, quantity: number) {
  try {
    await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId, quantity }),
    })
  } catch { /* silent */ }
}

async function apiRemove(productId: number) {
  try {
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId }),
    })
  } catch { /* silent */ }
}

async function apiClear() {
  try {
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ clearAll: true }),
    })
  } catch { /* silent */ }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [recentlyAddedItem, setRecentlyAddedItem] = useState<number | null>(null)
  const [showAddToCartPopup, setShowAddToCartPopup] = useState(false)
  const [addToCartPopupProduct, setAddToCartPopupProduct] = useState<CartContextType["addToCartPopupProduct"]>(null)

  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const prevAuthRef = useRef<boolean>(false)
  const didLoadRef = useRef<boolean>(false)
  // Becomes true only after the initial cart load (DB or localStorage) finishes.
  // Guards the persist effect so the empty initial state can never overwrite a
  // saved guest cart before it has been read back in.
  const [hydrated, setHydrated] = useState(false)

  // --- Boot: load cart from DB (auth) or localStorage (guest) ------------
  // Wait for the auth session check to settle (authLoading === false) before
  // deciding which source to read. Running while auth is still loading would
  // treat a logged-in user as a guest, set didLoadRef, and then skip the DB
  // load once auth resolves — leaving the cart empty on refresh.
  useEffect(() => {
    if (didLoadRef.current) return
    if (authLoading) return

    if (isAuthenticated) {
      didLoadRef.current = true
      // Load from DB
      fetch("/api/cart", { credentials: "include" })
        .then((r) => r.json())
        .then(({ items }) => {
          if (Array.isArray(items) && items.length > 0) {
            dispatch({ type: "LOAD_CART", payload: items })
          }
        })
        .catch(() => {})
        .finally(() => setHydrated(true))
    } else {
      // Guest: load from localStorage
      try {
        const saved = localStorage.getItem("cart")
        if (saved) {
          const parsed: CartItem[] = JSON.parse(saved)
          dispatch({ type: "LOAD_CART", payload: parsed })
        }
      } catch { /* ignore */ }
      didLoadRef.current = true
      setHydrated(true)
    }
  }, [isAuthenticated, authLoading])

  // --- On login: merge guest localStorage cart into DB -------------------
  useEffect(() => {
    const wasGuest = !prevAuthRef.current
    const isNowAuth = isAuthenticated

    if (wasGuest && isNowAuth) {
      try {
        const saved = localStorage.getItem("cart")
        if (saved) {
          const guestItems: CartItem[] = JSON.parse(saved)
          if (guestItems.length > 0) {
            // Push each guest item into the DB (upsert — server adds to existing qty)
            guestItems.forEach((item) => apiAdd(item.id, item.quantity))
            // Then fetch the merged cart back
            fetch("/api/cart", { credentials: "include" })
              .then((r) => r.json())
              .then(({ items }) => {
                if (Array.isArray(items)) dispatch({ type: "LOAD_CART", payload: items })
              })
              .catch(() => {})
            localStorage.removeItem("cart")
          }
        }
      } catch { /* ignore */ }
    }

    prevAuthRef.current = isNowAuth
  }, [isAuthenticated])

  // --- Guest: persist to localStorage ------------------------------------
  // Only after hydration — otherwise the empty initial state would clobber the
  // saved cart on the first render (before the boot effect reads it back).
  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      try {
        localStorage.setItem("cart", JSON.stringify(state.items))
      } catch { /* ignore */ }
    }
  }, [state.items, isAuthenticated, hydrated])

  // --- Wrapped dispatch that also syncs to DB when authenticated ----------
  const syncedDispatch: React.Dispatch<CartAction> = (action) => {
    dispatch(action)
    if (!isAuthenticated) return

    switch (action.type) {
      case "ADD_ITEM":
        apiAdd((action.payload as CartItem).id, 1)
        break
      case "REMOVE_ITEM":
        apiRemove(action.payload as number)
        break
      case "UPDATE_QUANTITY":
        apiSetQuantity(
          (action.payload as { id: number; quantity: number }).id,
          (action.payload as { id: number; quantity: number }).quantity
        )
        break
      case "CLEAR_CART":
        apiClear()
        break
    }
  }

  const getCartCount = () => state.itemCount
  const getTotalAmount = () => state.totalAmount

  const clearCart = () => {
    syncedDispatch({ type: "CLEAR_CART" })
  }

  const addItemWithAnimation = async (item: Omit<CartItem, "quantity">, quantity = 1) => {
    setIsAddingToCart(true)
    setRecentlyAddedItem(item.id)
    await new Promise((resolve) => setTimeout(resolve, 300))

    if (isAuthenticated) {
      // For DB-backed cart, send the full quantity in one call
      apiAdd(item.id, quantity)
      // Optimistic local update
      for (let i = 0; i < quantity; i++) {
        dispatch({ type: "ADD_ITEM", payload: item })
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        dispatch({ type: "ADD_ITEM", payload: item })
      }
    }

    setAddToCartPopupProduct({
      id: item.id,
      name: item.name,
      price: item.price,
      originalPrice: item.originalPrice,
      image: item.image,
      category: item.category,
      quantity,
    })
    setShowAddToCartPopup(true)
    setIsAddingToCart(false)
    setTimeout(() => setRecentlyAddedItem(null), 1500)
  }

  const closeAddToCartPopup = () => {
    setShowAddToCartPopup(false)
    setAddToCartPopupProduct(null)
  }

  const value: CartContextType = {
    state,
    dispatch: syncedDispatch,
    getCartCount,
    getTotalAmount,
    clearCart,
    addItemWithAnimation,
    isAddingToCart,
    recentlyAddedItem,
    showAddToCartPopup,
    addToCartPopupProduct,
    closeAddToCartPopup,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within a CartProvider")
  return context
}
