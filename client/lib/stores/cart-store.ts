"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export interface CartProduct {
  id: string
  name: string
  category: string
  price: string      // formatted string, e.g. "$28.00"
  priceValue: number // numeric for calculations
  imageUrl: string
  description: string
}

export interface CartItem {
  product: CartProduct
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (product: CartProduct, quantity: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],

      addItem: (product, quantity) =>
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
            }
          }
          return { items: [...state.items, { product, quantity }] }
        }),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.product.id !== productId)
              : state.items.map((i) =>
                  i.product.id === productId ? { ...i, quantity } : i,
                ),
        })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "bayd-cart",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
)
