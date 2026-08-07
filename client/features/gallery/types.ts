export type GalleryCategory = "Lashes" | "Nails" | "Pedicure" | "Massage";

export type GalleryItem = {
  id: string;
  title: string;
  category: GalleryCategory;
  description: string;
  image: {
    src: string;
    alt: string;
    position?: string;
  };
  size?: "standard" | "wide" | "tall";
};
