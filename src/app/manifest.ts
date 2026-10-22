import type { MetadataRoute } from "next";
/** "Add to home screen": opens full-screen like an app, with the OANRO icon and dark theme. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OANRO", short_name: "OANRO", description: "Thoughtfully chosen products and dependable technology.",
    start_url: "/", scope: "/", display: "standalone", background_color: "#07090a", theme_color: "#07090a", lang: "en",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" }, { src: "/apple-icon", sizes: "180x180", type: "image/png" }],
    shortcuts: [{ name: "Track my order", url: "/track" }, { name: "Seasonal collection", url: "/seasonal" }],
  };
}
