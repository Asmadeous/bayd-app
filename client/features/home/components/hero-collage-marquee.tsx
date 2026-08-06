import Image from "next/image";

const collageImages = [
  {
    src: "/images/new-pics-for-the-ladies/mobile-manicure-appointment-01.webp",
    alt: "A mobile manicure appointment at home",
  },
  {
    src: "/images/new-pics-for-the-ladies/nail-polish-application-close-up.webp",
    alt: "A nail technician applying polish during a manicure",
  },
  {
    src: "/images/new-pics-for-the-ladies/mobile-lash-appointment-01.webp",
    alt: "A client receiving a mobile lash service",
  },
  {
    src: "/images/new-pics-for-the-ladies/beauty-team-group-portrait-04.webp",
    alt: "The Beauty @ Your Door team",
  },
  {
    src: "/images/new-pics-for-the-ladies/mobile-manicure-service-02.webp",
    alt: "A nail technician providing a mobile manicure",
  },
  {
    src: "/images/new-pics-for-the-ladies/nail-technician-at-work-02.webp",
    alt: "A Beauty @ Your Door nail technician at work",
  },
  {
    src: "/images/new-pics-for-the-ladies/mobile-nail-care-service-01.webp",
    alt: "A client receiving professional mobile nail care",
  },
  {
    src: "/images/new-pics-for-the-ladies/gel-manicure-service-01.webp",
    alt: "A gel manicure service in progress",
  },
  {
    src: "/images/new-pics-for-the-ladies/finished-manicure-result-03.webp",
    alt: "A client's finished manicure",
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
