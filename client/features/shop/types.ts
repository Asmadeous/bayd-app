import type { StaticImageData } from "next/image";

export type ShopVariant = {
  id: string;
  label: string;
  colorName: string | null;
  colorHex: string | null;
  imageUrl: string | null;
  price: number;
  inStock: boolean;
};

export type ShopProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  priceValue: number;
  image: {
    src: string | StaticImageData;
    alt: string;
  };
  badge: string;
  description: string;
  details: string[];
  hasVariants: boolean;
  variants: ShopVariant[];
};
