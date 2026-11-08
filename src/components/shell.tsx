"use client";

// The site frame shared by every page: the header (menus, search, bag), the footer, and the
// product photo and price pieces used across the store.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "@/components/locale-link";
import {
  ArrowUpRight,
  ChevronDown,
  Menu,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  Mail,
  MapPin,
  Phone,
  Heart,
  UserRound,
} from "lucide-react";
import type { SiteConfig } from "@/lib/site-config";
import { formatPrice, lineFits, optionLabel, variantSoldOut } from "@/lib/catalog";
import { useProductLines, useProducts, useServices } from "./products-context";
import { HeaderSearch } from "./header-search";
import { useCart, changeQuantity, removeItem } from "@/lib/cart";
import { useWishlist } from "@/lib/saved-lists";
import { stripLocale } from "@/lib/locale-path";
import { MotionToggle } from "./experience";
import { PrivacySettingsLink } from "./privacy-center";
import { NewsletterSignup } from "./site-extras";
import { useFeature, useSiteContent, useText } from "./site-content-context";
import { SocialLinks } from "./social-icon";
import { mediaUrl } from "@/lib/site-content-data";
import { LanguageSwitch, Localized, RegionPicker, useLocale } from "./locale";

/** A product picture: the owner's photo when there is one, otherwise the matching area of the sample sprite. */
export function ProductPhoto({
  position,
  label,
  className = "",
  image,
}: {
  position: string;
  label: string;
  className?: string;
  image?: string | null;
}) {
  // Owner photos are same-origin URLs built by the server (/api/products/<slug>/image); otherwise use the sample sprite.
  // Real photos are a real <img> (with alt text) so Google Images and Shopping can index them; samples stay a CSS sprite.
  if (image?.startsWith("/api/products/"))
    return (
      <div className={`product-photo has-photo ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={label} loading="lazy" decoding="async" />
      </div>
    );
  return (
    <div
      className={`product-photo ${className}`}
      role="img"
      aria-label={label}
      style={{ backgroundPosition: position }}
    />
  );
}

/** Price, with the original price crossed out and the saving when the product is on sale. */
export function PriceTag({
  price,
  compareAt,
  locale = "en",
  className = "",
}: {
  price: number;
  compareAt?: number | null;
  locale?: "en" | "bn";
  className?: string;
}) {
  const sale = compareAt && compareAt > price ? compareAt : null;
  return (
    <span className={`price-tag ${className}`}>
      <strong>{formatPrice(price, locale)}</strong>
      {sale && (
        <>
          <s
            aria-label={
              locale === "bn"
                ? `আগের দাম ${formatPrice(sale, locale)}`
                : `Was ${formatPrice(sale, locale)}`
            }
          >
            {formatPrice(sale, locale)}
          </s>
          <span className="sale-badge">-{Math.round(((sale - price) / sale) * 100)}%</span>
        </>
      )}
    </span>
  );
}

/** Site header: logo, main menu with drop-down panels, language switch, search dialog and bag dialog. */
export function Header({ config }: { config: SiteConfig }) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const lines = useProductLines();
  const [mega, setMega] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const cartDialog = useRef<HTMLDialogElement>(null);

  // Other components open the bag with the "oanro-open-bag" event (for example after adding a product).

  useEffect(() => {
    const open = () => cartDialog.current?.showModal();
    window.addEventListener("oanro-open-bag", open);
    return () => window.removeEventListener("oanro-open-bag", open);
  }, []);
  const cart = useCart();
  const products = useProducts();
  const services = useServices();
  // Ignore saved bag items whose product or size is no longer offered.
  const bag = cart.flatMap(item => {
    const product = products.find(p => p.slug === item.slug && lineFits(p, item.size, item.color));
    return product ? [{ item, product, gone: variantSoldOut(product, item.size, item.color) }] : [];
  });
  const count = bag.reduce((sum, { item }) => sum + item.quantity, 0);
  const total = bag.reduce(
    (sum, { item, product, gone }) => sum + (gone ? 0 : product.price * item.quantity),
    0,
  );
  const closeMenu = () => {
    setMega(null);
    setMobile(false);
  };
  const wishlist = useWishlist();
  const pathname = stripLocale(usePathname() || "/");
  const active = (prefixes: string[]) =>
    prefixes.some(p => pathname === p || pathname.startsWith(`${p}/`));
  const collectionPaths = lines.map(l => `/${l.collection.slug}`);

  // Top navigation of the approved design: The store and The studio open panels; Software and
  // Workspace are pages. Store and Studio follow the products/services switches.

  const panels = [
    ...(config.products ? (["store"] as const) : []),
    ...(config.services ? (["studio"] as const) : []),
  ];
  const panelLabel = { store: t("The store", "স্টোর"), studio: t("The studio", "স্টুডিও") };
  const panelActive = {
    store: active(["/shop", "/products", "/wishlist", "/compare", "/checkout", ...collectionPaths]),
    studio: active(["/services", "/contact", "/guides", "/about", "/company-profile"]),
  };
  return (
    <>
      <header
        className="o-site-header"
        onMouseLeave={() => setMega(null)}
        onKeyDown={e => {
          if (e.key === "Escape") closeMenu();
        }}
      >
        <div className="o-header">
          <Link
            href="/"
            className="o-wordmark"
            aria-label={t("OANRO home", "OANRO হোম")}
            onClick={closeMenu}
          >
            <Image src="/logo.svg" alt="" width={34} height={34} priority />
            OANRO<span aria-hidden="true">®</span>
          </Link>
          <button
            type="button"
            className="o-mobile-menu"
            aria-label={t("Toggle navigation", "নেভিগেশন খুলুন/বন্ধ করুন")}
            aria-expanded={mobile}
            aria-controls="o-main-nav"
            onClick={() => {
              setMobile(!mobile);
              setMega(null);
            }}
          >
            {mobile ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav
            id="o-main-nav"
            className={mobile ? "open" : ""}
            aria-label={t("Main navigation", "প্রধান নেভিগেশন")}
          >
            {panels.map(panel => (
              <button
                key={panel}
                type="button"
                className={panelActive[panel] ? "active" : ""}
                aria-expanded={mega === panel}
                aria-controls={`o-panel-${panel}`}
                onMouseEnter={() => {
                  if (window.matchMedia("(hover: hover)").matches) setMega(panel);
                }}
                onClick={() => setMega(mega === panel ? null : panel)}
              >
                {panelLabel[panel]}
                <ChevronDown size={13} aria-hidden="true" />
              </button>
            ))}
            <Link
              href="/software"
              className={active(["/software"]) ? "active" : ""}
              aria-current={active(["/software"]) ? "page" : undefined}
              onClick={closeMenu}
            >
              {t("Software", "সফটওয়্যার")}
            </Link>
            <Link
              href="/workspace"
              className={active(["/workspace"]) ? "active" : ""}
              aria-current={active(["/workspace"]) ? "page" : undefined}
              onClick={closeMenu}
            >
              {t("Workspace", "ওয়ার্কস্পেস")}
            </Link>
          </nav>
          <div className="o-header-actions">
            <LanguageSwitch />
            <HeaderSearch onOpen={closeMenu} />
            {config.products && (
              <Link
                href="/wishlist"
                title={t("Wishlist", "পছন্দের তালিকা")}
                aria-label={t(
                  `Wishlist, ${wishlist.length} items`,
                  `পছন্দের তালিকা, ${wishlist.length}টি`,
                )}
                onClick={closeMenu}
              >
                <Heart size={20} />
                {wishlist.length > 0 && <small>{wishlist.length}</small>}
              </Link>
            )}
            {config.products && (
              <button
                type="button"
                className="cart-trigger"
                title={t("Open bag", "ব্যাগ খুলুন")}
                aria-label={t(`Open bag, ${count} items`, `ব্যাগ খুলুন, ${count}টি আইটেম`)}
                onClick={() => {
                  closeMenu();
                  cartDialog.current?.showModal();
                }}
              >
                <ShoppingBag size={20} />
                {count > 0 && <small key={count}>{count}</small>}
              </button>
            )}
            <Link
              href="/account"
              title={t("Your account", "আপনার অ্যাকাউন্ট")}
              aria-label={t("Your account", "আপনার অ্যাকাউন্ট")}
              onClick={closeMenu}
            >
              <UserRound size={20} />
            </Link>
          </div>
        </div>
        {panels.map(panel => (
          <div id={`o-panel-${panel}`} key={panel} className="o-mega" hidden={mega !== panel}>
            <div className="o-mega-inner">
              <div className="o-mega-intro">
                <span className="o-eyebrow">
                  {panel === "store"
                    ? t("OANRO / STORE", "OANRO / স্টোর")
                    : t("OANRO / STUDIO", "OANRO / স্টুডিও")}
                </span>
                <h2>
                  {panel === "store"
                    ? t("Good things for every day.", "প্রতিদিনের পছন্দের জিনিস।")
                    : t("Websites, apps and software.", "ওয়েবসাইট, অ্যাপ ও সফটওয়্যার।")}
                </h2>
                <Link
                  className="o-button"
                  href={panel === "store" ? "/shop" : "/services"}
                  onClick={closeMenu}
                >
                  {panel === "store"
                    ? t("Shop everything", "সব পণ্য দেখুন")
                    : t("Explore the studio", "স্টুডিও ঘুরে দেখুন")}
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <div className="o-mega-links">
                {panel === "store" && (
                  <>
                    <span className="o-mega-heading">{t("Collections", "কালেকশন")}</span>
                    {!lines.some(l => l.count > 0) && (
                      <p className="o-mega-empty">
                        {t("New products are on the way.", "নতুন পণ্য আসছে।")}
                      </p>
                    )}
                    {lines
                      .filter(l => l.count > 0)
                      .map(({ collection: c, count: n }) => (
                        <Link onClick={closeMenu} key={c.id} href={`/${c.slug}`}>
                          <span>{bn && c.bn ? c.bn.name : c.name}</span>
                          <small>{n}</small>
                        </Link>
                      ))}
                    {config.partners && (
                      <Link href="/#partners" onClick={closeMenu}>
                        <span>{t("Partner Picks", "পার্টনার পছন্দ")}</span>
                        <ArrowUpRight size={15} />
                      </Link>
                    )}
                  </>
                )}
                {panel === "studio" && (
                  <>
                    <span className="o-mega-heading">{t("Services", "সেবা")}</span>
                    {services.map(s => (
                      <Link key={s.slug} href={`/services/${s.slug}`} onClick={closeMenu}>
                        <span>{bn && s.bn ? s.bn.title : s.title}</span>
                        <ArrowUpRight size={15} />
                      </Link>
                    ))}
                  </>
                )}
              </div>
              <div className="o-mega-links">
                <span className="o-mega-heading">
                  {panel === "store" ? t("Your OANRO", "আপনার OANRO") : t("Company", "কোম্পানি")}
                </span>
                {panel === "store" ? (
                  <>
                    <Link href="/wishlist" onClick={closeMenu}>
                      <span>{t("Wishlist", "পছন্দের তালিকা")}</span>
                      <ArrowUpRight size={15} />
                    </Link>
                    <Link href="/compare" onClick={closeMenu}>
                      <span>{t("Compare", "তুলনা")}</span>
                      <ArrowUpRight size={15} />
                    </Link>
                    <Link href="/track" onClick={closeMenu}>
                      <span>{t("Track your order", "অর্ডার ট্র্যাক করুন")}</span>
                      <ArrowUpRight size={15} />
                    </Link>
                    <Link href="/delivery-returns" onClick={closeMenu}>
                      <span>{t("Delivery & returns", "ডেলিভারি ও রিটার্ন")}</span>
                      <ArrowUpRight size={15} />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/contact" onClick={closeMenu}>
                      <span>{t("Tell us your idea", "আইডিয়া জানান")}</span>
                      <ArrowUpRight size={15} />
                    </Link>
                    <Link href="/guides" onClick={closeMenu}>
                      <span>{t("Guides & Global Pulse", "গাইড ও গ্লোবাল পালস")}</span>
                      <ArrowUpRight size={15} />
                    </Link>
                    <Link href="/about" onClick={closeMenu}>
                      <span>{t("About OANRO", "OANRO সম্পর্কে")}</span>
                      <ArrowUpRight size={15} />
                    </Link>
                    <Link href="/company-profile" onClick={closeMenu}>
                      <span>{t("Company profile", "কোম্পানি প্রোফাইল")}</span>
                      <ArrowUpRight size={15} />
                    </Link>
                  </>
                )}
              </div>
              <MegaPicture group={panel === "store" ? "Products" : "Services"} />
            </div>
          </div>
        ))}
      </header>

      {/* Bag dialog. */}
      <dialog
        ref={cartDialog}
        className="cart-dialog"
        aria-labelledby="bag-title"
        onClick={e => {
          if (e.target === e.currentTarget) cartDialog.current?.close();
        }}
      >
        <div className="dialog-content">
          <div className="dialog-heading">
            <h2 id="bag-title">
              <Localized en="Your bag" bn="আপনার ব্যাগ" />
            </h2>
            <button
              type="button"
              className="icon-button"
              title="Close bag"
              aria-label="Close bag"
              onClick={() => cartDialog.current?.close()}
            >
              <X />
            </button>
          </div>
          <p className="demo-notice">
            <Localized
              en="Sign in at checkout to place your order."
              bn="অর্ডার দিতে চেকআউটে সাইন ইন করুন।"
            />
          </p>
          {!bag.length ? (
            <div className="empty-state">
              <ShoppingBag size={32} />
              <h3>
                <Localized en="A little room for discovery." bn="আবিষ্কারের জন্য একটু জায়গা।" />
              </h3>
              <p>
                <Localized en="Your bag is empty." bn="আপনার ব্যাগ খালি।" />
              </p>
              <Link
                className="button brand-button"
                href="/#products"
                onClick={() => cartDialog.current?.close()}
              >
                <Localized en="Explore products" bn="পণ্য দেখুন" />
                <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <div className="bag-items">
                {bag.map(({ item, product, gone }) => {
                  return (
                    <article className="bag-item" key={`${item.slug}-${item.size}-${item.color}`}>
                      <ProductPhoto
                        position={product.position}
                        image={product.image}
                        label={product.name}
                      />
                      <div>
                        <Link
                          href={`/products/${product.slug}`}
                          onClick={() => cartDialog.current?.close()}
                        >
                          {bn && product.bn ? product.bn.name : product.name}
                        </Link>
                        <small>
                          {optionLabel(product, item.size, item.color, bn)} /{" "}
                          {gone ? (
                            <strong className="stock-badge">
                              <Localized en="Out of stock" bn="স্টক শেষ" />
                            </strong>
                          ) : (
                            formatPrice(product.price)
                          )}
                        </small>
                        <div className="quantity-controls">
                          <button
                            type="button"
                            title="Decrease quantity"
                            aria-label={`Decrease ${product.name}`}
                            onClick={() => changeQuantity(item.slug, item.size, -1, item.color)}
                          >
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            title="Increase quantity"
                            disabled={item.quantity >= 10 || gone}
                            aria-label={`Increase ${product.name}`}
                            onClick={() => changeQuantity(item.slug, item.size, 1, item.color)}
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            type="button"
                            title="Remove item"
                            aria-label={`Remove ${product.name}`}
                            onClick={() => removeItem(item.slug, item.size, item.color)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="bag-total">
                <span>
                  <Localized en="Subtotal" bn="সাবটোটাল" />
                </span>
                <strong>{formatPrice(total, locale)}</strong>
              </div>
              <Link
                className="button brand-button bag-checkout"
                href="/checkout"
                onClick={() => cartDialog.current?.close()}
              >
                <Localized en="Checkout" bn="চেকআউট" />
                <ArrowUpRight size={16} />
              </Link>
              <p className="small-note">
                <Localized
                  en="Pay with bKash or Nagad. Delivery charges are confirmed with your order."
                  bn="bKash বা Nagad-এ পেমেন্ট করুন। ডেলিভারি চার্জ অর্ডারের সাথে নিশ্চিত করা হবে।"
                />
              </p>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

/** Site footer (approved structure): brand, description and contact with the compact newsletter on the
 * left; Store, Studio, Your OANRO and Help & Company link groups on the right (collapsible on phones);
 * then copyright, region/language, privacy and motion controls and the social links. */
export function Footer({ config }: { config: SiteConfig }) {
  const { locale, setLocale } = useLocale();
  const bn = locale === "bn";
  const lines = useProductLines().filter(line => line.count > 0);
  const services = useServices();
  const t = (en: string, b: string) => (bn ? b : en);
  const footerTagline = useText("footer.tagline"),
    showNewsletter = useFeature("newsletter"),
    showSocial = useFeature("socialIcons");
  const { contact } = useSiteContent();
  const address = bn ? contact.address.bn || contact.address.en : contact.address.en;
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const link = (href: string, en: string, b: string) => (
    <Link key={href} href={href}>
      {t(en, b)}
    </Link>
  );
  const groups: { id: string; title: string; links: ReactNode[] }[] = [
    ...(config.products
      ? [
          {
            id: "store",
            title: t("Store", "স্টোর"),
            links: [
              link("/shop", "Shop everything", "সব পণ্য"),
              ...lines.map(({ collection }) => (
                <Link key={collection.id} href={`/${collection.slug}`}>
                  {bn && collection.bn ? collection.bn.name : collection.name}
                </Link>
              )),
              ...(config.partners ? [link("/#partners", "Partner Picks", "পার্টনার পছন্দ")] : []),
            ],
          },
        ]
      : []),
    {
      id: "studio",
      title: t("Studio", "স্টুডিও"),
      links: [
        ...(config.services ? [link("/services", "All services", "সব সেবা")] : []),
        ...(config.services
          ? services.map(s => (
              <Link key={s.slug} href={`/services/${s.slug}`}>
                {bn && s.bn ? s.bn.title : s.title}
              </Link>
            ))
          : []),
        link("/software", "Software", "সফটওয়্যার"),
        link("/workspace", "Client workspace", "ক্লায়েন্ট ওয়ার্কস্পেস"),
      ],
    },
    {
      id: "you",
      title: t("Your OANRO", "আপনার OANRO"),
      links: [
        link("/account", "My account", "আমার অ্যাকাউন্ট"),
        ...(config.products
          ? [
              link("/wishlist", "Saved favourites", "পছন্দের তালিকা"),
              link("/compare", "Compare", "তুলনা"),
              link("/checkout", "Shopping bag", "শপিং ব্যাগ"),
            ]
          : []),
        link("/account?tab=projects", "My projects", "আমার প্রজেক্ট"),
      ],
    },
    {
      id: "help",
      title: t("Help & Company", "সহায়তা ও কোম্পানি"),
      links: [
        link("/track", "Track your order", "অর্ডার ট্র্যাক করুন"),
        link("/delivery-returns", "Delivery & returns", "ডেলিভারি ও রিটার্ন"),
        link("/contact", "Contact", "যোগাযোগ"),
        link("/guides", "Guides & Global Pulse", "গাইড ও গ্লোবাল পালস"),
        link("/about", "About OANRO", "OANRO সম্পর্কে"),
        link("/company-profile", "Company profile", "কোম্পানি প্রোফাইল"),
        link("/privacy", "Privacy", "প্রাইভেসি"),
        link("/terms", "Terms", "শর্তাবলি"),
      ],
    },
  ];
  return (
    <footer className="o-footer">
      <div className="o-footer-top">
        <div className="o-footer-brand">
          <Link className="o-wordmark" href="/">
            <Image src="/logo-on-dark.svg" alt="" width={34} height={34} loading="lazy" />
            OANRO<span aria-hidden="true">®</span>
          </Link>
          <p>
            {footerTagline ||
              t(
                "Good things for today.\nGreat possibilities for tomorrow.",
                "আজকের পছন্দের জিনিস।\nআগামীর বড় সম্ভাবনা।",
              )}
          </p>
          {(contact.email || contact.phone || address) && (
            <ul className="o-footer-contact">
              {contact.email && (
                <li>
                  <Mail size={15} aria-hidden="true" />
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </li>
              )}
              {contact.phone && (
                <li>
                  <Phone size={15} aria-hidden="true" />
                  <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                </li>
              )}
              {address && (
                <li>
                  <MapPin size={15} aria-hidden="true" />
                  <span>{address}</span>
                </li>
              )}
            </ul>
          )}
          {showNewsletter && <NewsletterSignup />}
        </div>
        <div className="o-footer-groups">
          {groups.map(g => (
            <nav
              key={g.id}
              aria-labelledby={`footer-${g.id}`}
              className={openGroup === g.id ? "is-open" : ""}
            >
              <h3 id={`footer-${g.id}`}>
                <span className="o-footer-heading">{g.title}</span>
                <button
                  type="button"
                  className="o-footer-toggle"
                  aria-expanded={openGroup === g.id}
                  aria-controls={`footer-${g.id}-links`}
                  onClick={() => setOpenGroup(openGroup === g.id ? null : g.id)}
                >
                  {g.title}
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
              </h3>
              <div id={`footer-${g.id}-links`} className="o-footer-links">
                {g.links}
              </div>
            </nav>
          ))}
        </div>
      </div>
      <div className="o-footer-bottom">
        <span>
          {t("© 2026 OANRO · Licensed business", "© ২০২৬ OANRO · লাইসেন্সপ্রাপ্ত ব্যবসা")}
        </span>
        <div className="o-footer-market">
          <RegionPicker />
          <span className="o-footer-langs" role="group" aria-label={t("Language", "ভাষা")}>
            <button type="button" aria-pressed={!bn} onClick={() => setLocale("en")}>
              English
            </button>
            <span aria-hidden="true">/</span>
            <button type="button" aria-pressed={bn} onClick={() => setLocale("bn")} lang="bn">
              বাংলা
            </button>
          </span>
          <PrivacySettingsLink />
          <MotionToggle />
        </div>
        {showSocial && <SocialLinks socials={contact.socials} />}
      </div>
    </footer>
  );
}

/** Picture beside a drop-down menu: the owner's upload from Admin → Website content → Images, or a calm OANRO placeholder. */
function MegaPicture({ group }: { group: string }) {
  const content = useSiteContent();
  const slot =
    group === "Products" ? "menu-products" : group === "Services" ? "menu-services" : "menu-about";
  const label = useText(
    group === "Products" ? "menu.products" : group === "Services" ? "menu.services" : "menu.about",
  );
  const src = mediaUrl(content, slot);
  return (
    <div className={`mega-feature${src ? "" : " is-placeholder"}`}>
      {src ? (
        <Image src={src} alt="" fill sizes="300px" unoptimized />
      ) : (
        <Image src="/logo.svg" alt="" width={72} height={72} className="mega-mark" loading="lazy" />
      )}
      {label && <span>{label}</span>}
    </div>
  );
}
