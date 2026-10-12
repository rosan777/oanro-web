export type Product = {
  slug: string; name: string; category: string; tagline: string; description: string;
  price: number; position: string; sizes: string[]; specs: [string, string][];
};
export const products: Product[] = [
  { slug: "forest-knit", name: "The Forest Knit", category: "Winter essentials", tagline: "Texture you can feel.",
    description: "A cable-knit concept in deep forest green. Explore the texture, the relaxed silhouette, and the little details that make a winter layer feel special.",
    price: 2490, position: "0% 0%", sizes: ["S", "M", "L", "XL"],
    specs: [["Concept", "Cable-knit sweater"], ["Color", "Forest green"], ["Fit direction", "Relaxed"], ["Material", "To be confirmed before sale"]] },
  { slug: "charcoal-overshirt", name: "The Everyday Layer", category: "Modern layers", tagline: "A little structure. A lot of ease.",
    description: "A charcoal overshirt concept with clean lines and an easy shape. A versatile visual direction for OANRO's first seasonal collection.",
    price: 2990, position: "100% 0%", sizes: ["S", "M", "L", "XL"],
    specs: [["Concept", "Button-front overshirt"], ["Color", "Charcoal"], ["Style", "Layering piece"], ["Fabric weight", "To be confirmed before sale"]] },
  { slug: "winter-set", name: "The Winter Pair", category: "Accessories", tagline: "Small details. Warmer days.",
    description: "A coordinated scarf and beanie concept. Deep green and charcoal bring a quiet finishing touch to colder days.",
    price: 1190, position: "0% 100%", sizes: ["One size"],
    specs: [["Concept", "Scarf and beanie pair"], ["Palette", "Forest green / charcoal"], ["Sizing", "One-size concept"], ["Dimensions", "To be confirmed before sale"]] },
  { slug: "studio-headphones", name: "Studio Wireless", category: "Technology", tagline: "Make room for your sound.",
    description: "An over-ear headphone concept with sculpted cushions and a considered silhouette. Explore the sample imagery and an interactive 3D concept model.",
    price: 4990, position: "100% 100%", sizes: ["Standard"],
    specs: [["Concept", "Over-ear wireless headphones"], ["Color", "Matte black"], ["3D model", "Illustrative concept, not engineering geometry"], ["Battery and connectivity", "To be verified before sale"]] },
];
export const services = [
  { slug: "web", title: "Web development", word: "WEB", text: "A thoughtful home for your business online.", detail: "Websites, customer portals, and commerce experiences built around your audience and business goals." },
  { slug: "app", title: "Mobile applications", word: "APP", text: "Practical ideas, ready for everyday life.", detail: "Explore mobile app requirements, platform choices, and an achievable delivery plan." },
  { slug: "systems", title: "Business software", word: "BUILD", text: "Bring your work into a clearer system.", detail: "Tools for orders, inventory, reporting, and the workflows your business depends on." },
  { slug: "strategy", title: "Technology strategy", word: "NEXT", text: "A clearer direction for what comes next.", detail: "Review your current tools, identify priorities, and define a practical next step." },
];
export function formatPrice(value: number) { return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(value); }
