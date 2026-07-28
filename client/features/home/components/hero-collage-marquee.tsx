import Image from "next/image";

const collageImages = [
  {
    src: "/images/Medicure1.jpg",
    alt: "A manicure service with a nail technician using an electric file",
  },
  {
    src: "/images/lashes2.jpg",
    alt: "A smiling client with under-eye pads during lash care",
  },
  {
    src: "/images/pedicure1.jpg",
    alt: "A client receiving a pedicure while seated in a spa robe",
  },
  {
    src: "/images/lashes4.jpg",
    alt: "Close-up lash service result",
  },
  {
    src: "/images/pedicure2.jpg",
    alt: "A pedicure service being performed in a spa chair",
  },
  {
    src: "/images/lashes3.jpg",
    alt: "A before and after lash extension close-up",
  },
  {
    src: "/images/massage.jpg",
    alt: "A woman getting a massage",
  },
  {
    src: "/images/lashes7.jpg",
    alt: "A lady lashes",
  },
  {
    src: "/images/nails2.jpg",
    alt: "A lady getting her nails done",
  },
];

const firstRowImages = [
  collageImages[0],
  collageImages[1],
  collageImages[2],
  collageImages[3],
  collageImages[4],
  collageImages[5],
  collageImages[6],
  collageImages[7],
  collageImages[8],
];

const secondRowImages = [
  collageImages[3],
  collageImages[5],
  collageImages[8],
  collageImages[1],
  collageImages[4],
  collageImages[6],
  collageImages[0],
  collageImages[2],
  collageImages[7],
];

function CollageRow({
  animationClass,
  images,
}: {
  animationClass: string;
  images: typeof collageImages;
}) {
  const rowImages = [...images, ...images];

  return (
    <div className={`flex w-max ${animationClass}`}>
      {rowImages.map((image, index) => (
        <div
          className="relative h-44 w-64 shrink-0 overflow-hidden sm:h-56 sm:w-80 lg:h-72 lg:w-[28rem]"
          key={`${image.src}-${index}`}
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 448px, (min-width: 640px) 320px, 256px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

export function HeroCollageMarquee() {
  return (
    <div className="relative left-1/2 mt-12 w-[100dvw] -translate-x-1/2 overflow-hidden bg-[#f4f1eb]">
      <CollageRow
        animationClass="animate-collage-marquee-fast"
        images={firstRowImages}
      />
      <CollageRow
        animationClass="animate-collage-marquee-slow -translate-x-28"
        images={secondRowImages}
      />
    </div>
  );
}
