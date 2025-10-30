import { cn } from "@/lib/utils";

export type BrandKey =
  | "whatsapp"
  | "bling"
  | "tiny"
  | "shopify"
  | "mercado-livre"
  | "shopee"
  | "shein";

type BrandLogoProps = {
  brand: BrandKey;
  size?: number;
  className?: string;
};

const brandAssets: Record<
  BrandKey,
  {
    src: string;
    alt: string;
    padding?: string;
    imgClass?: string;
  }
> = {
  whatsapp: {
    src: "/logos/whatsapp.png",
    alt: "WhatsApp",
    padding: "p-2",
  },
  bling: {
    src: "/logos/bling.svg",
    alt: "Bling",
    padding: "p-2.5",
  },
  tiny: {
    src: "/logos/tiny.jpg",
    alt: "Tiny",
    padding: "p-2.5",
  },
  shopify: {
    src: "/logos/shopify.svg",
    alt: "Shopify",
    padding: "p-2.5",
  },
  "mercado-livre": {
    src: "/logos/mercado-livre.png",
    alt: "Mercado Livre",
    padding: "p-2.5",
  },
  shopee: {
    src: "/logos/shopee.png",
    alt: "Shopee",
    padding: "p-2.5",
  },
  shein: {
    src: "/logos/shein.png",
    alt: "Shein",
    padding: "p-2.5",
    imgClass: "dark:invert",
  },
};

export function BrandLogo({ brand, size = 48, className }: BrandLogoProps) {
  const asset = brandAssets[brand];

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-white ring-1 ring-border/40 shadow-sm dark:bg-white",
        asset.padding ?? "p-2.5",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={asset.src}
        alt={asset.alt}
        className={cn("h-full w-full object-contain", asset.imgClass)}
        loading="lazy"
      />
    </div>
  );
}

