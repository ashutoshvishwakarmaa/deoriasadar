import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Deoria City Guide",
    short_name: "Deoria",
    description: "Temples, trains, offices and emergency helplines for Deoria, Uttar Pradesh.",
    start_url: "/en",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#1a1813",
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Emergency numbers", short_name: "Emergency", url: "/en/emergency" },
      { name: "आपातकालीन नंबर", short_name: "आपातकाल", url: "/hi/emergency" },
    ],
  };
}
