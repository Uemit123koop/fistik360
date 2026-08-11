import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  preload?: boolean;
  sizes?: string;
}

export const brandLogoPath = "/brand/fistik-logo-360.png";

export function BrandLogo({
  className = "h-14 w-40",
  preload = false,
  sizes = "180px",
}: BrandLogoProps) {
  return (
    <span className={`relative block shrink-0 overflow-hidden ${className}`}>
      <Image
        src={brandLogoPath}
        alt="Fıstık360"
        width={1772}
        height={1181}
        preload={preload}
        sizes={sizes}
        className="absolute left-1/2 top-1/2 h-auto w-[135%] max-w-none -translate-x-1/2 -translate-y-1/2"
      />
    </span>
  );
}
