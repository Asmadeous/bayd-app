"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Minus, Plus, ShoppingBag, X } from "lucide-react"

import { Capacitor } from "@capacitor/core"

import api from "@/lib/api"
import { openHelcimPay } from "@/lib/helcim-pay"
import { openPaymentUrl } from "@/lib/native/open-external"
import { assetUrl } from "@/lib/asset-url"
import { useCartStore, type CartProduct } from "@/lib/stores/cart-store"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useToast, useConfirm } from "@/lib/app-ui/app-ui-provider"
import { hapticSuccess, hapticTap, hapticError } from "@/lib/native/haptics"
import { appScreenClass } from "../app-theme"
import { AppHeader } from "../app-header"

interface ApiVariant {
  id: number
  label: string
  color_name: string | null
  color_hex: string | null
  image_url: string | null
  price: string
  in_stock: boolean
}

interface ApiProduct {
  id: number
  name: string
  description: string | null
  price: string
  stock_quantity: number
  image_url: string | null
  gallery_urls: string[] | null
  category: string | null
  has_variants: boolean
  variants: ApiVariant[]
}

interface ApiProductsResponse {
  data: ApiProduct[]
}

interface CheckoutResponse {
  gateway: "helcim" | "square"
  order_id: number
  checkout_token?: string
  redirect_url?: string
}

export default function ShopScreen() {
  return (
    <Suspense>
      <Shop />
    </Suspense>
  )
}

function Shop() {
  const { items, addItem } = useCartStore()
  // ?tab=gift-cards opens straight on gift cards (linked from the Gift cards screen).
  const initialTab = useSearchParams().get("tab") === "gift-cards" ? "gift-cards" : "products"
  const [tab, setTab] = useState<"products" | "gift-cards">(initialTab)
  const [cartOpen, setCartOpen] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [detail, setDetail] = useState<ApiProduct | null>(null)

  const { data, isLoading } = useQuery<ApiProductsResponse>({
    queryKey: ["shop-products"],
    queryFn: () => api.get<ApiProductsResponse>("/products").then((r) => r.data),
  })
  const allProducts = useMemo(() => data?.data ?? [], [data])

  const categories = useMemo(() => {
    const seen: string[] = []
    for (const p of allProducts) {
      const c = p.category ?? "Other"
      if (!seen.includes(c)) seen.push(c)
    }
    return seen
  }, [allProducts])

  const products = useMemo(
    () => (category ? allProducts.filter((p) => (p.category ?? "Other") === category) : allProducts),
    [allProducts, category],
  )

  const count = items.reduce((n, i) => n + i.quantity, 0)

  return (
    <div className={appScreenClass}>
      <AppHeader
        title="Shop"
        subtitle="Beauty products, delivered."
        action={
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
            className="relative grid size-10 place-items-center rounded-full bg-[#101217] text-white"
          >
            <ShoppingBag className="size-5" aria-hidden />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#c96c83] text-[0.65rem] font-bold text-white">
                {count}
              </span>
            )}
          </button>
        }
      />

      {/* Products / Gift Cards tabs */}
      <div className="mx-5 mb-4 grid grid-cols-2 gap-1 rounded-full bg-black/5 p-1">
        {(["products", "gift-cards"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              hapticTap()
              setTab(t)
            }}
            className={`rounded-full py-2 text-sm font-semibold transition-colors ${
              tab === t ? "bg-[#101217] text-white" : "text-[#101217]/55"
            }`}
          >
            {t === "products" ? "Products" : "Gift cards"}
          </button>
        ))}
      </div>

      {tab === "gift-cards" ? (
        <GiftCardTab />
      ) : (
        <>
          {categories.length > 1 && (
            <div className="mb-3 flex gap-2 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterChip label="All" active={category === null} onClick={() => setCategory(null)} />
              {categories.map((c) => (
                <FilterChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
              ))}
            </div>
          )}

          <div className="px-5">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-52 animate-pulse rounded-2xl bg-black/5" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} onOpen={() => setDetail(p)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {detail && (
        <ProductDetailSheet
          product={detail}
          onClose={() => setDetail(null)}
          onAdd={(cp, qty) => {
            addItem(cp, qty)
            hapticSuccess()
            setDetail(null)
            setCartOpen(true)
          }}
        />
      )}

      {cartOpen && <CartSheet onClose={() => setCartOpen(false)} />}
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        hapticTap()
        onClick()
      }}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-[#101217] text-white" : "bg-white text-[#101217]/60"
      }`}
    >
      {label}
    </button>
  )
}

function priceLabel(product: ApiProduct): string {
  if (product.has_variants && product.variants.length > 0) {
    const min = Math.min(...product.variants.map((v) => Number(v.price)))
    return `from $${min.toFixed(2)}`
  }
  return `$${Number(product.price).toFixed(2)}`
}

function ProductCard({ product, onOpen }: { product: ApiProduct; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm"
    >
      <span
        className="aspect-square w-full bg-cover bg-center bg-black/5"
        style={{ backgroundImage: `url(${assetUrl(product.image_url) ?? assetUrl("/images/lashes1.jpg")})` }}
        aria-hidden
      />
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-bold leading-tight">{product.name}</p>
        <p className="mt-1 text-sm text-[#101217]/55">{priceLabel(product)}</p>
        <span className="mt-2.5 rounded-lg bg-[#c96c83] py-2 text-center text-sm font-bold text-white">
          {product.has_variants ? "Choose options" : "View"}
        </span>
      </div>
    </button>
  )
}

function ProductDetailSheet({
  product,
  onClose,
  onAdd,
}: {
  product: ApiProduct
  onClose: () => void
  onAdd: (cp: CartProduct, qty: number) => void
}) {
  const hasVariants = product.has_variants && product.variants.length > 0
  const [variant, setVariant] = useState<ApiVariant | null>(hasVariants ? null : null)
  const [qty, setQty] = useState(1)

  const gallery = [product.image_url, ...(product.gallery_urls ?? [])].filter(Boolean) as string[]
  const activeImg = variant?.image_url ?? gallery[0] ?? "/images/lashes1.jpg"
  const priceValue = variant ? Number(variant.price) : Number(product.price)
  const canAdd = !hasVariants || variant != null

  function add() {
    const cp: CartProduct = {
      id: variant ? `${product.id}:${variant.id}` : String(product.id),
      productId: String(product.id),
      variantId: variant ? String(variant.id) : undefined,
      variantLabel: variant?.label,
      name: product.name,
      category: product.category ?? "Beauty",
      price: `$${priceValue.toFixed(2)}`,
      priceValue,
      imageUrl: assetUrl(activeImg) ?? "",
      description: product.description ?? "",
    }
    onAdd(cp, qty)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-[#f4f1eb] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-10 flex justify-end bg-[#f4f1eb] px-5 pt-4">
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white shadow-sm">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="px-5">
          <span
            className="mb-4 block aspect-square w-full rounded-2xl bg-cover bg-center bg-black/5"
            style={{ backgroundImage: `url(${assetUrl(activeImg)})` }}
            aria-hidden
          />

          {gallery.length > 1 && (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {gallery.map((g) => (
                <span
                  key={g}
                  className="size-14 shrink-0 rounded-lg bg-cover bg-center bg-black/5"
                  style={{ backgroundImage: `url(${assetUrl(g)})` }}
                  aria-hidden
                />
              ))}
            </div>
          )}

          <h2 className="text-xl font-extrabold">{product.name}</h2>
          <p className="mt-1 text-lg font-bold text-[#c96c83]">${priceValue.toFixed(2)}</p>
          {product.description && (
            <p className="mt-3 text-sm leading-relaxed text-[#101217]/70">{product.description}</p>
          )}

          {hasVariants && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#101217]/45">
                Choose {product.variants[0]?.color_name ? "colour" : "option"}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const active = variant?.id === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!v.in_stock}
                      onClick={() => {
                        hapticTap()
                        setVariant(v)
                      }}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
                        active ? "border-[#c96c83] bg-[#c96c83]/10 text-[#c96c83]" : "border-black/15 bg-white text-[#101217]/70"
                      }`}
                    >
                      {v.color_hex && (
                        <span className="size-4 rounded-full border border-black/10" style={{ background: v.color_hex }} aria-hidden />
                      )}
                      {v.label}
                      {!v.in_stock && " (out)"}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-full bg-white px-2 py-1 shadow-sm">
              <button type="button" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-8 place-items-center rounded-full bg-black/5">
                <Minus className="size-4" aria-hidden />
              </button>
              <span className="w-5 text-center text-sm font-bold">{qty}</span>
              <button type="button" aria-label="Increase" onClick={() => setQty((q) => q + 1)} className="grid size-8 place-items-center rounded-full bg-black/5">
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={!canAdd}
              className="flex-1 rounded-xl bg-[#c96c83] py-3.5 text-base font-bold text-white disabled:opacity-40"
            >
              {canAdd ? "Add to cart" : "Choose an option"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CartSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { items, updateQuantity, clearCart } = useCartStore()
  const { toast } = useToast()
  const confirm = useConfirm()
  const [checkingOut, setCheckingOut] = useState(false)

  const total = items.reduce((sum, i) => sum + i.product.priceValue * i.quantity, 0)

  async function abandonCart() {
    const ok = await confirm({
      title: "Empty your cart?",
      message: "This removes all items from your cart. You can't undo this.",
      confirmLabel: "Empty cart",
      tone: "danger",
    })
    if (ok) {
      clearCart()
      toast({ title: "Cart emptied", variant: "warning" })
      onClose()
    }
  }

  async function checkout() {
    setCheckingOut(true)
    try {
      const email = useAuthStore.getState().user?.email
      // In the native app, HelcimPay.js's embedded iframe can't hold its session
      // in the Android WebView (storage partitioning), so its token is rejected.
      // Square uses a hosted page opened in the in-app browser, which works. Web
      // keeps Helcim (the iframe works in a real browser).
      const { data } = await api.post<CheckoutResponse>("/checkout", {
        ...(Capacitor.isNativePlatform() ? { gateway: "square" } : {}),
        ...(email ? { customer: { email } } : {}),
        items: items.map((i) => ({
          product_id: i.product.productId,
          product_variant_id: i.product.variantId,
          quantity: i.quantity,
        })),
      })

      if (data.gateway === "helcim" && data.checkout_token) {
        const result = await openHelcimPay(data.checkout_token)
        if (result === "success") {
          hapticSuccess()
          clearCart()
          onClose()
          toast({ title: "Payment received", description: "Your order is confirmed.", variant: "success" })
          router.push("/app/orders")
        } else if (result === "error") {
          hapticError()
          toast({ title: "Payment couldn't be completed", description: "Please try again.", variant: "error" })
        }
        return
      }
      if (data.gateway === "square" && data.redirect_url) {
        clearCart()
        // When the hosted-checkout browser closes, land on Orders instead of the
        // cart (the order is confirmed by the backend webhook).
        void openPaymentUrl(data.redirect_url, () => window.location.assign("/app/orders"))
        return
      }
      toast({ title: "Checkout isn't set up right now", description: "Please try again later.", variant: "error" })
    } catch (err: unknown) {
      hapticError()
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast({ title: "Couldn't start checkout", description: msg || "Please try again.", variant: "error" })
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button type="button" aria-label="Close cart" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative max-h-[80dvh] rounded-t-3xl bg-[#f4f1eb] pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-extrabold">Your cart</h2>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={abandonCart}
                className="text-sm font-semibold text-[#8f3f4b]"
              >
                Empty
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="max-h-[46dvh] overflow-y-auto px-5">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#101217]/50">Your cart is empty.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((i) => (
                <li key={i.product.id} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                  <span className="size-14 shrink-0 rounded-xl bg-cover bg-center bg-black/5" style={{ backgroundImage: `url(${assetUrl(i.product.imageUrl)})` }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{i.product.name}</p>
                    {i.product.variantLabel && <p className="text-xs text-[#101217]/50">{i.product.variantLabel}</p>}
                    <p className="text-sm text-[#101217]/55">{i.product.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Decrease" onClick={() => updateQuantity(i.product.id, i.quantity - 1)} className="grid size-7 place-items-center rounded-full bg-black/5">
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{i.quantity}</span>
                    <button type="button" aria-label="Increase" onClick={() => updateQuantity(i.product.id, i.quantity + 1)} className="grid size-7 place-items-center rounded-full bg-black/5">
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-5 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold">Total</span>
              <span className="text-lg font-extrabold">${total.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={checkout}
              disabled={checkingOut}
              className="w-full rounded-xl bg-[#101217] py-3.5 text-base font-bold text-white disabled:opacity-50"
            >
              {checkingOut ? "Starting checkout…" : "Checkout"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function GiftCardTab() {
  const { toast } = useToast()
  const [amount, setAmount] = useState(50)
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  const AMOUNTS = [25, 50, 75, 100, 150]

  async function purchase() {
    setBusy(true)
    try {
      const senderName = useAuthStore.getState().user?.first_name ?? undefined
      const data = await api
        .post<{ gateway: string; gift_card_id: number; checkout_token?: string; redirect_url?: string }>("/gift_cards", {
          amount,
          recipient_name: recipientName.trim() || undefined,
          recipient_email: recipientEmail.trim() || undefined,
          sender_name: senderName,
          message: message.trim() || undefined,
        })
        .then((r) => r.data)

      if (data.checkout_token) {
        const result = await openHelcimPay(data.checkout_token)
        if (result === "success") {
          hapticSuccess()
          toast({
            title: "Gift card purchased",
            description: "It's emailed to the recipient once payment clears.",
            variant: "success",
          })
        } else if (result === "error") {
          hapticError()
          toast({ title: "Payment couldn't be completed", description: "Please try again.", variant: "error" })
        }
      } else if (data.redirect_url) {
        void openPaymentUrl(data.redirect_url, () => window.location.assign("/app/orders"))
      } else {
        toast({ title: "Couldn't start the payment", description: "Please try again.", variant: "error" })
      }
    } catch {
      hapticError()
      toast({ title: "Couldn't start the purchase", description: "Please sign in and try again.", variant: "error" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-5 pb-8">
      <div className="rounded-3xl bg-gradient-to-br from-[#c96c83] to-[#a9526a] p-6 text-white shadow-[0_12px_30px_-14px_rgba(201,108,131,0.7)]">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">BAYD Gift Card</p>
        <p className="mt-2 text-4xl font-extrabold">${amount}</p>
      </div>

      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#101217]/45">Amount</p>
      <div className="flex flex-wrap gap-2">
        {AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => { hapticTap(); setAmount(a) }}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
              amount === a ? "border-[#c96c83] bg-[#c96c83] text-white" : "border-black/15 bg-white text-[#101217]/70"
            }`}
          >
            ${a}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <input
          placeholder="Recipient name (optional)"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base"
        />
        <input
          type="email"
          inputMode="email"
          placeholder="Recipient email (optional)"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base"
        />
        <textarea
          placeholder="Message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base"
        />
      </div>

      <button
        type="button"
        onClick={purchase}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-[#101217] py-3.5 text-base font-bold text-white disabled:opacity-50"
      >
        {busy ? "Starting…" : `Buy $${amount} gift card`}
      </button>
    </div>
  )
}
