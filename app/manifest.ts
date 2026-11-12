import type { MetadataRoute } from "next";

/** What a phone shows when PayHalo is added to the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PayHalo — A life built. A legacy kept.",
    short_name: "PayHalo",
    description:
      "Record what you own, decide who inherits it, appoint a Trusted Key, and leave instructions your family can follow.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7FDFA",
    theme_color: "#0B3D2E",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/payhalo-mark.png", sizes: "592x348", type: "image/png" },
    ],
  };
}
