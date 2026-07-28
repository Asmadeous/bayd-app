"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, MouseEvent } from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import type { ShopProduct } from "@/features/shop/types";
import api from "@/lib/api";
import { BookButton } from "@/components/ui/book-button";
import type { CartItem, CartProduct } from "@/lib/stores/cart-store";
import { useCartStore } from "@/lib/stores/cart-store";
import { cn } from "@/lib/utils";

interface ApiProduct {
  id: number;
  name: string;
  description: string | null;
  price: string;
  stock_quantity: number;
  image_url: string | null;
  category: string | null;
}

interface ApiProductsResponse {
  data: ApiProduct[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    next_page: number | null;
  };
}

const BADGES = [
  "Best seller",
  "Everyday care",
  "Spa finish",
  "Group ready",
  "Aftercare",
  "New",
];

function parsePrice(price: string) {
  return Number(price.replace(/[^0-9.]/g, "")) || 0;
}

function mapApiProduct(p: ApiProduct, index: number): ShopProduct {
  return {
    id: String(p.id),
    name: p.name,
    category: p.category ?? "Beauty",
    price: `$${Number(p.price).toFixed(2)}`,
    image: {
      src: p.image_url ?? "/images/lashes1.jpg",
      alt: p.name,
    },
    badge: BADGES[index % BADGES.length] ?? "New",
    description: p.description ?? "",
    details: [],
  };
}

function toCartProduct(product: ShopProduct): CartProduct {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    priceValue: parsePrice(product.price),
    imageUrl:
      typeof product.image.src === "string"
        ? product.image.src
        : "/images/lashes1.jpg",
    description: product.description,
  };
}

export function ShopPage() {
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(
    null,
  );
  const [modalOrigin, setModalOrigin] = useState({ x: 0, y: 0 });
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [isCartClosing, setIsCartClosing] = useState(false);

  const { items: cartItems, addItem, updateQuantity } = useCartStore();

  const { data: apiData } = useQuery<ApiProductsResponse>({
    queryKey: ["shop-products"],
    queryFn: () =>
      api.get<ApiProductsResponse>("/products").then((r) => r.data),
  });

  const products = useMemo(
    () => (apiData?.data ?? []).map(mapApiProduct),
    [apiData],
  );

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  function openProduct(
    product: ShopProduct,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    const rect = event.currentTarget.getBoundingClientRect();

    setModalOrigin({
      x: rect.left + rect.width / 2 - window.innerWidth / 2,
      y: rect.top + rect.height / 2 - window.innerHeight / 2,
    });
    setSelectedProduct(product);
  }

  function addToCart(product: ShopProduct, quantity: number) {
    addItem(toCartProduct(product), quantity);
    setSelectedProduct(null);
    openCart();
  }

  function openCart() {
    setIsCartClosing(false);
    setIsCartVisible(true);
  }

  function closeCart() {
    setIsCartClosing(true);
    window.setTimeout(() => {
      setIsCartVisible(false);
      setIsCartClosing(false);
    }, 280);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader cartCount={cartCount} onOpenCart={openCart} />
      <main>
        <ShopHero products={products} />
        <ProductShowcase onSelectProduct={openProduct} products={products} />
        <ShopBookingBand />
      </main>
      <SiteFooter />
      {selectedProduct ? (
        <ProductModal
          modalOrigin={modalOrigin}
          onAddToCart={addToCart}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
        />
      ) : null}
      <CartDialog
        closing={isCartClosing}
        items={cartItems}
        onClose={closeCart}
        onQuantityChange={updateQuantity}
        open={isCartVisible}
      />
    </div>
  );
}

function ShopHero({ products }: { products: ShopProduct[] }) {
  const featuredProduct = products[0];

  if (!featuredProduct) return null;

  return (
    <section className="overflow-hidden bg-[#f4f1eb] text-[#101217]">
      <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-20 lg:pt-16 2xl:px-10">
        <div className="flex min-h-[540px] flex-col justify-between">
          <ScrollReveal variant="fade-right">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">
              Beauty Shop
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
              Shop beauty essentials for every appointment.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#4f535a] sm:text-lg">
              Browse aftercare, body care, skin care, fragrance, and event-ready
              add-ons selected for clients who want their results to last
              between visits.
            </p>
            <div className="mt-8 flex">
              <Link
                className={cn(
                  buttonVariants(),
                  "h-12 px-6 text-base font-bold",
                )}
                href="#products"
              >
                Browse products
                <ShoppingBag aria-hidden="true" />
              </Link>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal
          className="grid gap-4 self-end md:grid-cols-[0.82fr_1.18fr]"
          delay={90}
          variant="clip-up"
        >
          <article className="relative isolate flex min-h-80 flex-col justify-between overflow-hidden bg-[#101217] p-6 text-white md:min-h-[520px]">
            <Image
              src={featuredProduct.image.src}
              alt={featuredProduct.image.alt}
              fill
              sizes="(min-width: 1024px) 36vw, 100vw"
              className="-z-20 object-cover opacity-75"
              priority
            />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(16,18,23,0.18),rgba(16,18,23,0.92))]" />
            <span className="w-fit bg-white px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#101217]">
              Featured
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#f0c8d3]">
                {featuredProduct.category}
              </p>
              <h2 className="mt-3 max-w-md text-4xl font-extrabold tracking-tight">
                {featuredProduct.name}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/72">
                {featuredProduct.description}
              </p>
            </div>
          </article>

          <div className="grid gap-4">
            {products.slice(1, 4).map((product, index) => (
              <MiniProductCard
                key={product.id}
                product={product}
                translate={index === 1}
              />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function ProductShowcase({
  onSelectProduct,
  products,
}: {
  onSelectProduct: (
    product: ShopProduct,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  products: ShopProduct[];
}) {
  return (
    <section className="bg-background py-20 text-[#101217]" id="products">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {products.map((product, index) => (
            <ScrollReveal
              as="article"
              className="h-full"
              delay={(index % 4) * 70}
              key={product.id}
              variant="scale-up"
            >
              <ProductCard onSelect={onSelectProduct} product={product} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  onSelect,
  product,
}: {
  onSelect: (product: ShopProduct, event: MouseEvent<HTMLButtonElement>) => void;
  product: ShopProduct;
}) {
  return (
    <button
      className="group h-full w-full overflow-hidden border border-black/10 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10"
      onClick={(event) => onSelect(product, event)}
      type="button"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f1eb]">
        <Image
          src={product.image.src}
          alt={product.image.alt}
          fill
          sizes="(min-width: 1024px) 34vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 bg-white px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#101217]">
          {product.badge}
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              {product.category}
            </p>
            <h3 className="mt-2 text-xl font-extrabold tracking-tight">
              {product.name}
            </h3>
          </div>
          <p className="shrink-0 text-xl font-extrabold">{product.price}</p>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#5f6268]">
          {product.description}
        </p>
        {product.details.length > 0 && (
          <div className="mt-5 space-y-2 border-t border-black/10 pt-4">
            {product.details.map((detail) => (
              <p
                className="flex items-center gap-2 text-sm font-semibold text-[#272a2f]"
                key={detail}
              >
                <PackageCheck
                  aria-hidden="true"
                  className="size-4 text-[#a36f4d]"
                />
                {detail}
              </p>
            ))}
          </div>
        )}
        <span className="mt-5 inline-flex h-10 items-center justify-center bg-[#101217] px-5 text-sm font-extrabold text-white transition-colors group-hover:bg-[#c96c83]">
          View product
        </span>
      </div>
    </button>
  );
}

function MiniProductCard({
  product,
  translate,
}: {
  product: ShopProduct;
  translate: boolean;
}) {
  return (
    <article
      className={cn(
        "grid min-h-40 grid-cols-[7.5rem_1fr] overflow-hidden border border-black/10 bg-white shadow-sm",
        translate ? "md:translate-x-8" : "",
      )}
    >
      <div className="relative">
        <Image
          src={product.image.src}
          alt={product.image.alt}
          fill
          sizes="160px"
          className="object-cover"
        />
      </div>
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
          {product.category}
        </p>
        <h3 className="mt-2 text-xl font-extrabold tracking-tight">
          {product.name}
        </h3>
        <p className="mt-3 text-sm font-extrabold">{product.price}</p>
      </div>
    </article>
  );
}

function ShopBookingBand() {
  return (
    <section className="bg-[#f4f1eb] py-18">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <ScrollReveal className="grid gap-6 bg-[#101217] p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f0c8d3]">
              Need product help?
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Pair products with a service booking, event setup, or aftercare
              plan.
            </h2>
          </div>
          <Link
            className={cn(
              buttonVariants(),
              "h-12 bg-white px-6 text-base font-bold text-[#101217] hover:bg-white/85",
            )}
            href="/#contact"
          >
            Talk to us
            <Sparkles aria-hidden="true" />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}

function ProductModal({
  modalOrigin,
  onAddToCart,
  onClose,
  product,
}: {
  modalOrigin: {
    x: number;
    y: number;
  };
  onAddToCart: (product: ShopProduct, quantity: number) => void;
  onClose: () => void;
  product: ShopProduct;
}) {
  const [quantity, setQuantity] = useState(1);

  const panelStyle = {
    "--modal-x": `${modalOrigin.x}px`,
    "--modal-y": `${modalOrigin.y}px`,
  } as CSSProperties;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid animate-service-modal-overlay place-items-center bg-black/45 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="animate-service-modal-panel relative grid max-h-[92vh] w-full max-w-6xl overflow-y-auto bg-[#f4f1eb] p-4 shadow-2xl shadow-black/20 lg:grid-cols-[1fr_0.92fr] lg:p-8"
        onClick={(event) => event.stopPropagation()}
        style={panelStyle}
      >
        <button
          aria-label="Close product details"
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center bg-white text-[#101217] shadow-sm transition-colors hover:bg-[#101217] hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        <div className="relative min-h-[360px] overflow-hidden bg-[#ddd2c8] sm:min-h-[520px] lg:min-h-[620px]">
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="animate-service-image-grow-down object-cover"
          />
        </div>

        <div className="px-1 py-8 lg:px-8 lg:py-0">
          <p className="animate-service-content-1 text-sm font-extrabold uppercase tracking-[0.22em] text-[#a36f4d]">
            {product.category}
          </p>
          <h2 className="animate-service-content-2 mt-5 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-[#101217] sm:text-5xl">
            {product.name}
          </h2>
          <p className="animate-service-content-3 mt-5 text-3xl font-extrabold text-[#101217]">
            {product.price}
          </p>
          <p className="animate-service-content-4 mt-6 text-sm leading-6 text-[#3f4248]">
            {product.description}
          </p>

          {product.details.length > 0 && (
            <div className="animate-service-content-5 mt-7">
              <h3 className="text-sm font-extrabold uppercase text-[#101217]">
                Product Details:
              </h3>
              <ul className="mt-3 space-y-4">
                {product.details.map((detail) => (
                  <li
                    className="text-sm leading-6 text-[#3f4248] before:mr-2 before:inline-block before:size-2 before:bg-[#101217] before:content-['']"
                    key={detail}
                  >
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="animate-service-content-6 mt-8">
            <p className="text-sm font-extrabold uppercase text-[#101217]">
              Quantity
            </p>
            <div className="mt-3 grid h-12 w-full max-w-52 grid-cols-3 border border-black/20 bg-white">
              <button
                aria-label="Decrease quantity"
                className="grid place-items-center text-[#101217] transition-colors hover:bg-[#f0c8d3]"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                type="button"
              >
                <Minus aria-hidden="true" className="size-4" />
              </button>
              <span className="grid place-items-center border-x border-black/20 text-sm font-extrabold">
                {quantity}
              </span>
              <button
                aria-label="Increase quantity"
                className="grid place-items-center text-[#101217] transition-colors hover:bg-[#f0c8d3]"
                onClick={() => setQuantity((value) => value + 1)}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>

          <button
            className={cn(
              buttonVariants(),
              "animate-service-content-7 mt-8 h-12 rounded-none px-8 text-base font-bold",
            )}
            onClick={() => {
              onAddToCart(product, quantity);
              setQuantity(1);
            }}
            type="button"
          >
            Add to cart
            <ShoppingBag aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CartDialog({
  closing,
  items,
  onClose,
  onQuantityChange,
  open,
}: {
  closing: boolean;
  items: CartItem[];
  onClose: () => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  open: boolean;
}) {
  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.product.priceValue * item.quantity,
        0,
      ),
    [items],
  );

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm",
        closing ? "animate-cart-overlay-out" : "animate-cart-overlay-in",
      )}
      onClick={onClose}
      role="dialog"
    >
      <aside
        className={cn(
          "flex h-full w-full max-w-xl flex-col bg-[#f4f1eb] shadow-2xl shadow-black/20",
          closing ? "animate-cart-panel-out" : "animate-cart-panel-in",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#a36f4d]">
              Shopping Cart
            </p>
            <h2 className="mt-1 text-3xl font-extrabold text-[#101217]">
              Your products
            </h2>
          </div>
          <button
            aria-label="Close cart"
            className="grid size-9 place-items-center bg-white text-[#101217] shadow-sm transition-colors hover:bg-[#101217] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="grid min-h-80 place-items-center border border-dashed border-black/20 bg-white/60 p-8 text-center">
              <div>
                <ShoppingBag
                  aria-hidden="true"
                  className="mx-auto size-10 text-[#a36f4d]"
                />
                <p className="mt-4 text-xl font-extrabold text-[#101217]">
                  Your cart is empty.
                </p>
                <p className="mt-2 text-sm leading-6 text-[#5f6268]">
                  Open a product and add a quantity to start building your
                  order.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <article
                  className="grid grid-cols-[6rem_1fr] gap-4 border border-black/10 bg-white p-3"
                  key={item.product.id}
                >
                  <div className="relative aspect-square overflow-hidden bg-[#ddd2c8]">
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                          {item.product.category}
                        </p>
                        <h3 className="mt-1 text-base font-extrabold text-[#101217]">
                          {item.product.name}
                        </h3>
                        <p className="mt-1 text-sm font-bold text-[#101217]">
                          {item.product.price}
                        </p>
                      </div>
                      <button
                        aria-label={`Remove ${item.product.name}`}
                        className="grid size-8 shrink-0 place-items-center text-[#5f6268] transition-colors hover:bg-[#101217] hover:text-white"
                        onClick={() => onQuantityChange(item.product.id, 0)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                    <div className="mt-4 grid h-10 w-36 grid-cols-3 border border-black/20">
                      <button
                        aria-label={`Decrease ${item.product.name} quantity`}
                        className="grid place-items-center transition-colors hover:bg-[#f0c8d3]"
                        onClick={() =>
                          onQuantityChange(item.product.id, item.quantity - 1)
                        }
                        type="button"
                      >
                        <Minus aria-hidden="true" className="size-4" />
                      </button>
                      <span className="grid place-items-center border-x border-black/20 text-sm font-extrabold">
                        {item.quantity}
                      </span>
                      <button
                        aria-label={`Increase ${item.product.name} quantity`}
                        className="grid place-items-center transition-colors hover:bg-[#f0c8d3]"
                        onClick={() =>
                          onQuantityChange(item.product.id, item.quantity + 1)
                        }
                        type="button"
                      >
                        <Plus aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-black/10 bg-white/75 p-5">
          <div className="flex items-center justify-between text-lg font-extrabold text-[#101217]">
            <span>Subtotal</span>
            <span>CA${subtotal.toFixed(2)}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#5f6268]">
            Tax and any delivery fees will be calculated at checkout.
          </p>
          <BookButton
            authenticatedHref="/checkout"
            className={cn(
              buttonVariants(),
              "mt-5 h-12 w-full rounded-none text-base font-bold",
              items.length === 0 ? "pointer-events-none opacity-50" : "",
            )}
          >
            Proceed to checkout
          </BookButton>
        </div>
      </aside>
    </div>
  );
}
