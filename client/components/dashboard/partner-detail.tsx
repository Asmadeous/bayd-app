"use client"

import { useToast } from "@/components/bayd-toast-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useMarkPayoutPaid, usePartnerDetail, useSettlePartner } from "@/lib/hooks/use-partners"
import { formatMoney } from "@/lib/stores/franchise-store"

const cad = (v: string | number) => `${formatMoney(Number(v))}`
const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "—")

// A partner's providers, what they're owed now (settled into a payout) and
// their payout history with "Mark paid". Shared by the web Partners page and
// the BAYD Admin app.
export function PartnerDetail({ partnerId, owed, pendingCount }: { partnerId: number; owed: string; pendingCount: number }) {
  const { toast } = useToast()
  const { data, isLoading } = usePartnerDetail(partnerId)
  const settle = useSettlePartner()
  const markPaid = useMarkPayoutPaid()

  if (isLoading || !data) return <div className="mt-3 text-xs text-[#5f6268]">Loading…</div>

  return (
    <div className="mt-4 space-y-5 border-t border-black/8 pt-4">
      {/* Providers */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6b6f76]">Providers</p>
        {data.providers.length === 0 ? (
          <p className="text-xs text-[#8a8d93]">None assigned. Set a provider&apos;s partner on the Employees page.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {data.providers.map((ep) => (
              <span key={ep.id} className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 text-[#101217]">
                {[ep.user?.first_name, ep.user?.last_name].filter(Boolean).join(" ")} · {ep.service_fsas.length} FSA
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Settle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-[#5f6268]">Owed now: <span className="font-semibold text-[#c96c83]">{cad(owed)}</span></p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="xs" disabled={pendingCount === 0 || settle.isPending}
              style={{ background: pendingCount === 0 ? "#e5e5e5" : "#101217", border: "none", color: "#fff" }}>
              {settle.isPending ? "Settling..." : `Create payout${pendingCount ? ` (${cad(owed)})` : ""}`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create partner payout?</AlertDialogTitle>
              <AlertDialogDescription>
                This will settle {pendingCount} completed booking{pendingCount === 1 ? "" : "s"} into a pending payout for {cad(owed)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => settle.mutate(partnerId, {
                  onSuccess: () => toast({ title: "Payout created", description: `${cad(owed)} is ready for payment.`, variant: "success" }),
                  onError: (error: unknown) => {
                    toast({
                      title: "Payout not created",
                      description: getApiErrorMessage(error, "Could not create this partner payout."),
                      variant: "error",
                    })
                  },
                })}
              >
                Create payout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Payout history */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6b6f76]">Payout history</p>
        {data.payouts.length === 0 ? (
          <p className="text-xs text-[#8a8d93]">No payouts yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.payouts.map((po) => (
              <div key={po.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[#5f6268]">
                  {dt(po.created_at)} · {po.booking_count} bookings · gross {cad(po.gross)} − fee {cad(po.fee_amount)} ={" "}
                  <span className="font-semibold text-[#101217]">{cad(po.amount)}</span>
                </span>
                {po.status === "paid" ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "#5a9e5a22", color: "#5a9e5a" }}>
                    Paid {dt(po.paid_at)}
                  </span>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="xs" variant="outline" disabled={markPaid.isPending}>Mark paid</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mark payout paid?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This records payout {cad(po.amount)} as paid and sets its paid date.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => markPaid.mutate(
                            { id: po.id },
                            {
                              onSuccess: () => toast({ title: "Payout marked paid", description: `${cad(po.amount)} was recorded as paid.`, variant: "success" }),
                              onError: (error: unknown) => {
                                toast({
                                  title: "Payout not updated",
                                  description: getApiErrorMessage(error, "Could not mark this payout paid."),
                                  variant: "error",
                                })
                              },
                            }
                          )}
                        >
                          Mark paid
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
