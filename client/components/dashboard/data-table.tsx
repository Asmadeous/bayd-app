import type { ComponentPropsWithoutRef, ReactNode } from "react"

import { cn } from "@/lib/utils"

type DataTableProps = {
  children: ReactNode
  className?: string
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div className={cn("overflow-hidden border border-black/10 bg-white shadow-sm shadow-black/[0.03]", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">{children}</table>
      </div>
    </div>
  )
}

export function DataTableHead(props: ComponentPropsWithoutRef<"thead">) {
  return <thead {...props} className={cn("bg-[#fbfaf7]", props.className)} />
}

export function DataTableBody(props: ComponentPropsWithoutRef<"tbody">) {
  return <tbody {...props} className={cn("divide-y divide-black/6", props.className)} />
}

export function DataTableRow(props: ComponentPropsWithoutRef<"tr">) {
  return <tr {...props} className={cn("transition-colors hover:bg-[#fbfaf7]", props.className)} />
}

export function DataTableHeaderCell(props: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      {...props}
      className={cn(
        "px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-[#6b6f76]",
        props.className,
      )}
    />
  )
}

export function DataTableCell(props: ComponentPropsWithoutRef<"td">) {
  return <td {...props} className={cn("px-4 py-3 align-middle text-[#5f6268]", props.className)} />
}
