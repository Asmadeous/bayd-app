import Image from "next/image"

interface GiftCardVisualProps {
  code: string
  balance: string | number
  expiresAt?: string | null
  recipientName?: string | null
  active?: boolean
}

/** Designed gift-card UI matching the delivery email. Used in both dashboards. */
export function GiftCardVisual({ code, balance, expiresAt, recipientName, active = true }: GiftCardVisualProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
      style={{
        background: active
          ? "linear-gradient(135deg,#c96c83 0%,#a36f4d 100%)"
          : "linear-gradient(135deg,#8a8d93 0%,#5f6268 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full"
        style={{ background: "rgba(255,255,255,0.12)" }}
      />
      <div className="flex items-start justify-between text-[11px] font-bold uppercase tracking-[0.18em] opacity-90">
        <Image
          alt="Beauty @ Your Door"
          className="h-9 w-auto object-contain"
          height={936}
          src="/images/brand/bayd-logo-white.png"
          unoptimized
          width={3264}
        />
        <span>Gift Card</span>
      </div>

      <div className="mt-5">
        <div className="text-4xl font-extrabold leading-none">
          ${Number(balance).toFixed(2)}
        </div>
        <div className="mt-1 text-xs opacity-85">value{!active && " · inactive"}</div>
      </div>

      <div className="mt-5 rounded-xl px-3.5 py-2.5" style={{ background: "rgba(255,255,255,0.16)" }}>
        <div className="text-[10px] uppercase tracking-[0.16em] opacity-85">Redeem code</div>
        <div className="mt-0.5 font-mono text-xl font-bold tracking-[0.12em]">{code}</div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] opacity-90">
        <span>{expiresAt ? `Expires ${new Date(expiresAt).toLocaleDateString("en-CA")}` : "No expiry"}</span>
        {recipientName ? <span>For {recipientName}</span> : <span>beautyatyourdoor.com</span>}
      </div>
    </div>
  )
}
