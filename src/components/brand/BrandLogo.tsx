import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";

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
  eager?: boolean;
};

type BrandConfig = {
  wrapperClass?: string;
  /** Default SVG fallback when no bitmap loads */
  vector?: JSX.Element;
  /** Primary image (custom upload) */
  defaultImage?: string;
  imageAlt?: string;
};

const brandConfig: Record<BrandKey, BrandConfig> = {
  whatsapp: {
    wrapperClass: "p-2",
    vector: (
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#25D366" />
        <path
          fill="#fff"
          d="M26 18c-2.2 0-4 1.8-4 4 0 13 11 24 24 24 2.2 0 4-1.8 4-4 0-.9-.3-1.7-.8-2.4l-3.4-4.2a3 3 0 0 0-3.5-.9l-2.8 1.2a2 2 0 0 1-2-.2 18.5 18.5 0 0 1-5.4-5.4 2 2 0 0 1-.2-2l1.2-2.8a3 3 0 0 0-.9-3.5l-4.2-3.4A3.9 3.9 0 0 0 26 18Z"
        />
        <path d="M13 51l3.5-9.9A19 19 0 0 1 13 32c0-10.5 8.5-19 19-19s19 8.5 19 19-8.5 19-19 19a19 19 0 0 1-9-2.2L13 51Z" fill="none" stroke="#0f3d25" strokeWidth="2" />
      </svg>
    ),
    defaultImage: "/logos/whatsapp.png",
  },
  bling: {
    wrapperClass: "p-2",
    imageAlt: "Bling",
    vector: (
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="64" height="64" rx="12" fill="#ffffff" />
        <path d="M42 10H22l-2 12h6l-3 20h10l3-20h6l-2-12Z" fill="#00c48c" />
        <circle cx="32" cy="50" r="6" fill="#00c48c" />
      </svg>
    ),
  },
  tiny: {
    wrapperClass: "p-2",
    defaultImage: "/logos/tiny.jpg",
    imageAlt: "Tiny",
    vector: (
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="64" height="64" rx="12" fill="#0D47A1" />
        <path d="M22 14h20v8h-6v28h-8V22h-6v-8Z" fill="#ffffff" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    ),
  },
  shopify: {
    wrapperClass: "p-2",
    imageAlt: "Shopify",
    vector: (
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M48 12 42 8 26 12l-6 40 16 4 16-4-4-40Z" fill="#95BF47" />
        <path d="M42 8c-4-2-7-3-10 1-2-2-4-2-6-1-3 1-5 4-5 7v1l-1 2 16-4 6-2Z" fill="#5E8E3E" />
        <path d="M34 20c-5 0-9 4-9 9 0 7 6 12 13 12 3 0 6-1 8-3l-2-5c-2 2-4 3-6 3-2 0-4-1-5-3h9c0-7-4-13-8-13Zm0 6c1 0 2 1 2 3h-5c0-2 1-3 3-3Z" fill="#fff" />
      </svg>
    ),
  },
  "mercado-livre": {
    wrapperClass: "p-2",
    imageAlt: "Mercado Livre",
    vector: (
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="32" cy="34" rx="28" ry="20" fill="#FFDB15" stroke="#12326B" strokeWidth="4" />
        <path d="M14 34c2-6 10-10 18-6l2 1 2-1c8-4 16 0 18 6l-6 6-6-3-6 4-6-4-6 3-6-6Z" fill="#fff" stroke="#12326B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 34c2 3 5 5 8 5s6-2 8-5" fill="none" stroke="#12326B" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  shopee: {
    wrapperClass: "p-2",
    imageAlt: "Shopee",
    vector: (
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M18 24c0-8 6-14 14-14s14 6 14 14v2h4v26H14V26h4v-2Z" fill="#EE4D2D" />
        <path d="M32 14c-4 0-8 3-8 8h4c0-2 1-4 4-4s4 2 4 4h4c0-5-4-8-8-8Z" fill="#fff" opacity="0.9" />
        <path d="M38 40c0 4-3 6-7 6s-7-2-7-6c0-3 2-5 6-6l2-1c1 0 2-1 2-2 0-2-1-3-3-3-1 0-3 1-3 2l-4-1c0-3 4-5 7-5 4 0 7 3 7 7 0 3-2 5-6 6l-1 1c-2 0-3 1-3 2 0 1 1 2 3 2s3-1 3-2l4 0Z" fill="#fff" />
      </svg>
    ),
  },
  shein: {
    wrapperClass: "p-2",
    defaultImage: "/logos/custom/shein.png",
    imageAlt: "Shein",
    vector: (
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="64" height="64" rx="12" fill="#111" />
        <text x="32" y="44" textAnchor="middle" fontSize="30" fontWeight="700" fill="#fff" fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif">S</text>
      </svg>
    ),
  },
};

export function BrandLogo({ brand, size = 48, className, eager = false }: BrandLogoProps) {
  const config = brandConfig[brand];

  const imageCandidates = useMemo(() => {
    const base = `/logos/custom/${brand}`;
    const list: string[] = [`${base}.svg`, `${base}.png`, `${base}.jpg`];
    if (config.defaultImage) list.push(config.defaultImage);
    return Array.from(new Set(list));
  }, [brand, config.defaultImage]);

  const [index, setIndex] = useState(0);
  const [useVector, setUseVector] = useState(imageCandidates.length === 0);

  const handleError = useCallback(() => {
    if (index < imageCandidates.length - 1) {
      setIndex((prev) => prev + 1);
    } else {
      setUseVector(true);
    }
  }, [index, imageCandidates.length]);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg shrink-0 ring-1 ring-border/40 bg-white dark:bg-white shadow-sm",
        config.wrapperClass ?? "p-2",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {useVector || imageCandidates.length === 0 ? (
        config.vector ?? null
      ) : (
        <img
          src={imageCandidates[index]}
          alt={config.imageAlt ?? `${brand} logo`}
          className="h-full w-full object-contain"
          loading={eager ? "eager" : "lazy"}
          onError={handleError}
        />
      )}
    </div>
  );
}
