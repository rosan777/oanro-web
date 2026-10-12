import "server-only";

// Public display settings only. Authentication and payment keys never go here.
export function getSiteConfig() {
  const products = process.env.OANRO_PRODUCTS !== "false";
  return {
    products,
    services: process.env.OANRO_SERVICES !== "false",
    partners: products && process.env.OANRO_PARTNERS !== "false",
    features: products && process.env.OANRO_FEATURES !== "false",
    intro: process.env.OANRO_INTRO !== "false",
    contactEmail: process.env.OANRO_CONTACT_EMAIL || "",
  };
}
export type SiteConfig = ReturnType<typeof getSiteConfig>;
