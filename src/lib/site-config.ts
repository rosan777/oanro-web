import "server-only";

// Public display settings only. Authentication and payment keys never go here.
export function getSiteConfig() {
  const products = process.env.OANRO_PRODUCTS !== "false";
  const whatsappNumber = (process.env.OANRO_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  return {
    products,
    services: process.env.OANRO_SERVICES !== "false",
    partners: products && process.env.OANRO_PARTNERS !== "false",
    features: products && process.env.OANRO_FEATURES !== "false",
    // Logo intro is off unless OANRO_INTRO=true.
    intro: process.env.OANRO_INTRO === "true",
    contactEmail: process.env.OANRO_CONTACT_EMAIL || "",
    messengerUrl: process.env.OANRO_MESSENGER_URL || "",
    whatsappUrl: whatsappNumber ? `https://wa.me/${whatsappNumber}` : "",
  };
}
export type SiteConfig = ReturnType<typeof getSiteConfig>;
