export type PriceItem = {
  name: string;
  price: string;
  duration?: string;
  note?: string;
  description?: string;
};

export type PriceCategory = {
  id: string;
  title: string;
  summary?: string;
  accent: string;
  items: PriceItem[];
};
