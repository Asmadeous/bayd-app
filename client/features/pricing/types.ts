import type { LucideIcon } from "lucide-react";

export type PriceItem = {
  name: string;
  price: string;
  note?: string;
};

export type PriceCategory = {
  id: string;
  title: string;
  summary?: string;
  accent: string;
  icon?: LucideIcon;
  items: PriceItem[];
};
