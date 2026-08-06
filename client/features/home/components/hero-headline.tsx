import Image from "next/image";

export function HeroHeadline() {
  return (
    <h1 className="max-w-[1480px] text-5xl font-extrabold leading-[1.08] text-[#101217] sm:text-6xl lg:text-7xl 2xl:text-[6.5rem]">
      <span className="block">Enhance Your Natural Beauty</span>
      <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>With Our</span>
        <span className="relative inline-block h-[0.88em] w-[2.55em] overflow-hidden rounded-full bg-[#ef9fb7] align-middle">
          <Image
            src="/images/lashes4.jpg"
            alt="Close-up beauty service result"
            fill
            priority
            sizes="(min-width: 1536px) 255px, (min-width: 1024px) 180px, 130px"
            className="object-cover"
          />
        </span>
        <span>Mobile Beauty Services</span>
      </span>
    </h1>
  );
}
