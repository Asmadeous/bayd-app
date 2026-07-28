import type { StaticImageData } from "next/image";

export type ShopProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  image: {
    src: string | StaticImageData;
    alt: string;
  };
  badge: string;
  description: string;
  details: string[];
};
