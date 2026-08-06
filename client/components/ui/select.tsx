"use client"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

function Select<Value>({
  modal = false,
  ...props
}: SelectPrimitive.Root.Props<Value> & { modal?: boolean }) {
  const normalizedProps = {
    ...props,
    value: props.value === "" ? null : props.value,
  } as SelectPrimitive.Root.Props<Value>

  return <SelectPrimitive.Root modal={modal} {...normalizedProps} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 border border-black/10 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors hover:bg-[#f8f6f2] focus-visible:border-[#c96c83] focus-visible:ring-3 focus-visible:ring-[#c96c83]/20 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-[#5f6268]",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-[#5f6268]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue(props: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value placeholder="Select..." {...props} />
}

function SelectContent({
  className,
  children,
  sideOffset = 6,
  ...props
}: SelectPrimitive.Popup.Props & { sideOffset?: number }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={sideOffset}>
        <SelectPrimitive.Popup
          className={cn(
            "z-50 max-h-72 min-w-[var(--anchor-width)] overflow-y-auto border border-black/10 bg-white p-1 text-[#101217] shadow-xl shadow-black/10 outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex min-h-9 cursor-default select-none items-center gap-2 px-3 py-2 pr-8 text-sm font-semibold outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[#f4f1eb] data-[selected]:text-[#c96c83]",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center justify-center">
        <Check aria-hidden="true" className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
