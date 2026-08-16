import Image from "next/image";

const GRAINS = [
  { left: "18%", duration: "1700ms", delay: "0ms" },
  { left: "34%", duration: "1500ms", delay: "220ms" },
  { left: "50%", duration: "1850ms", delay: "80ms" },
  { left: "64%", duration: "1600ms", delay: "340ms" },
  { left: "78%", duration: "1750ms", delay: "150ms" },
];

export function ProductPhotoVisual({
  src,
  alt,
  className = "aspect-square",
  sizes = "(max-width: 640px) 50vw, 170px",
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#eee3ce] ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="scale-100 object-contain p-2 transition-transform duration-700 ease-out group-hover:scale-[1.07]"
      />

      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 transition-[transform,opacity] duration-700 ease-out group-hover:translate-x-full group-hover:opacity-100" />

      {GRAINS.map((grain, index) => (
        <span
          key={index}
          className="pointer-events-none absolute top-0 h-1.5 w-1.5 rounded-full bg-[#f3e9d6] opacity-0 shadow-[0_1px_2px_rgba(0,0,0,.25)] [animation-play-state:paused] group-hover:[animation-play-state:running]"
          style={{
            left: grain.left,
            animation: `grain-fall ${grain.duration} ease-in infinite`,
            animationDelay: grain.delay,
          }}
        />
      ))}
    </div>
  );
}
