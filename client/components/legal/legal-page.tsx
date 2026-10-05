import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

// Shared shell for the public legal pages (privacy, terms): readable column,
// site header/footer, and a last-updated line.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 text-[#14100F] md:py-20">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-[#14100F]/60">Last updated {updated}</p>
        <div className="mt-8 space-y-4 leading-relaxed text-[#14100F]/80 [&_a]:font-semibold [&_a]:text-[#9E4A60] [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#14100F] [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
