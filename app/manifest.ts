import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ReceiptIQ — receipt overcharge & fee-trap scanner",
    short_name: "ReceiptIQ",
    description:
      "Scan a receipt and get instant verdicts on overpriced items and hidden subscription traps. Portfolio demo with illustrative price data.",
    id: "/",
    start_url: "/scan",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7ee",
    theme_color: "#fbf7ee",
    categories: ["shopping", "finance", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scan a receipt", url: "/scan" },
      { name: "How it works", url: "/about" },
    ],
  };
}
