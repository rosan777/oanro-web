import type { Product } from "@/lib/catalog";
import type { TextKey } from "@/lib/site-content-data";
import { NativeHomeEffects } from "./native-home-effects";

import { StoreObject } from "./store-object";

const storeArt = [["154","Sunglasses"],["83","Shirt"],["101","Headphones"],["88","Sneakers"],["173","Bag"],["94","Watch"],["103","Speaker"],["159","Tablet"],["90","Trainers"],["175","Backpack"]] as const;

export function SelectedHome({
  bn,
  text,
  showStore,
  products,
  featured,
}: {
  bn: boolean;
  text: (key: TextKey) => string;
  showStore: boolean;
  products: Product[];
  featured: Product | null;
}) {
  const headline = [text("home.line1"), text("home.line2")].join(" ").trim();
  const phrases = [
    headline,
    ...(bn
      ? [
          "স্বতন্ত্র ওয়েবসাইট ও অ্যাপ।",
          "প্রযুক্তিতে আরও সম্ভাবনা।",
          "আপনার প্রযুক্তির কাজ হোক সহজ।",
        ]
      : [
          "Websites and apps that set you apart.",
          "Technology that makes more possible.",
          "All your tech needs. Made simple.",
        ]),
  ];
  const photos = (
    featured ? [featured, ...products.filter(p => p.slug !== featured.slug)] : products
  )
    .filter(p => p.image)
    .slice(0, 10);
  return (
    <>
      <link rel="stylesheet" href="/selected-home/native.css" precedence="oanro-home" />
      <div className="selected-home intro-run" data-palette="1" data-v="1">
        <div id="studio-field" aria-hidden="true">
          <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="mesh-dot" width="26" height="26" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="currentColor" opacity=".19" />
              </pattern>
              <linearGradient id="glass-wash">
                <stop stopColor="#8495bb" stopOpacity="0" />
                <stop offset=".91" stopColor="#8495bb" stopOpacity=".11" />
                <stop offset=".984" stopColor="#8495bb" stopOpacity=".22" />
                <stop offset="1" stopColor="#8495bb" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="1200" height="800" fill="url(#mesh-dot)" />
            <path d="M54 -4V120l26 26v132l-26 26V805" className="trace" />
            <path
              d="M54 -4V120l26 26v132l-26 26V805"
              className="current"
              style={{ animationDelay: "-0s" }}
            />
            <path d="M50 72h8m-4 -4v8" className="register" style={{ animationDelay: "-2s" }} />
            <path d="M50 340h8m-4 -4v8" className="register" style={{ animationDelay: "-4s" }} />
            <path d="M50 675h8m-4 -4v8" className="register" style={{ animationDelay: "-3s" }} />
            <path d="M236 -4V237l26 26v132l-26 26V805" className="trace" />
            <path
              d="M236 -4V237l26 26v132l-26 26V805"
              className="current"
              style={{ animationDelay: "-3s" }}
            />
            <path d="M232 72h8m-4 -4v8" className="register" style={{ animationDelay: "-3s" }} />
            <path d="M232 340h8m-4 -4v8" className="register" style={{ animationDelay: "-5s" }} />
            <path d="M232 675h8m-4 -4v8" className="register" style={{ animationDelay: "-4s" }} />
            <path d="M418 -4V354l26 26v132l-26 26V805" className="trace" />
            <path
              d="M418 -4V354l26 26v132l-26 26V805"
              className="current"
              style={{ animationDelay: "-6s" }}
            />
            <path d="M414 72h8m-4 -4v8" className="register" style={{ animationDelay: "-4s" }} />
            <path d="M414 340h8m-4 -4v8" className="register" style={{ animationDelay: "-6s" }} />
            <path d="M414 675h8m-4 -4v8" className="register" style={{ animationDelay: "-5s" }} />
            <path d="M600 -4V471l26 26v132l-26 26V805" className="trace" />
            <path
              d="M600 -4V471l26 26v132l-26 26V805"
              className="current"
              style={{ animationDelay: "-9s" }}
            />
            <path d="M596 72h8m-4 -4v8" className="register" style={{ animationDelay: "-5s" }} />
            <path d="M596 340h8m-4 -4v8" className="register" style={{ animationDelay: "-7s" }} />
            <path d="M596 675h8m-4 -4v8" className="register" style={{ animationDelay: "-6s" }} />
            <path d="M782 -4V198l26 26v132l-26 26V805" className="trace" />
            <path
              d="M782 -4V198l26 26v132l-26 26V805"
              className="current"
              style={{ animationDelay: "-12s" }}
            />
            <path d="M778 72h8m-4 -4v8" className="register" style={{ animationDelay: "-6s" }} />
            <path d="M778 340h8m-4 -4v8" className="register" style={{ animationDelay: "-8s" }} />
            <path d="M778 675h8m-4 -4v8" className="register" style={{ animationDelay: "-7s" }} />
            <path d="M964 -4V315l26 26v132l-26 26V805" className="trace" />
            <path
              d="M964 -4V315l26 26v132l-26 26V805"
              className="current"
              style={{ animationDelay: "-15s" }}
            />
            <path d="M960 72h8m-4 -4v8" className="register" style={{ animationDelay: "-7s" }} />
            <path d="M960 340h8m-4 -4v8" className="register" style={{ animationDelay: "-9s" }} />
            <path d="M960 675h8m-4 -4v8" className="register" style={{ animationDelay: "-8s" }} />
            <path d="M1146 -4V432l26 26v132l-26 26V805" className="trace" />
            <path
              d="M1146 -4V432l26 26v132l-26 26V805"
              className="current"
              style={{ animationDelay: "-18s" }}
            />
            <path d="M1142 72h8m-4 -4v8" className="register" style={{ animationDelay: "-8s" }} />
            <path d="M1142 340h8m-4 -4v8" className="register" style={{ animationDelay: "-10s" }} />
            <path d="M1142 675h8m-4 -4v8" className="register" style={{ animationDelay: "-9s" }} />
            <g className="glass" fill="url(#glass-wash)">
              <path d="M-330 -40h184l452 880H122zM475 -40h146l452 880H927zM996 -40h110l452 880h-110z" />
            </g>
          </svg>
        </div>
        <div className="wrap">
          <select hidden id="theme" aria-label="Colour theme">
            <option>System</option>
            <option>Light</option>
            <option>Dark</option>
          </select>
          <section className="hero">
            <div className="copy">
              <div className="kicker">{text("home.eyebrow")}</div>
              <h1 data-finish="5" id="hero-headline" tabIndex={0} aria-live="off">
                {phrases.map((phrase, i) => (
                  <span key={i} aria-hidden={i !== 0}>
                    {phrase.split(/\s+/).map((word, j) => (
                      <b key={j}>
                        {j ? " " : ""}
                        {word}
                      </b>
                    ))}
                  </span>
                ))}
              </h1>
              <p>{text("home.lede")}</p>
              <div className="actions">
                <button className="action" id="run">
                  {bn ? "বুকিং চালান" : "Run booking"}
                </button>
              </div>
              <svg className="request-line" aria-hidden="true" viewBox="0 0 460 25">
                <path d="M6 19H150l20 -9h122l12 -5h149" />
                <circle cx="6" cy="19" r="3.7" />
                <circle cx="150" cy="19" r="3.7" />
                <circle cx="292" cy="10" r="3.7" />
                <circle cx="453" cy="5" r="3.7" />
              </svg>
              <div className="branch-labels" role="group" aria-label="Booking stages">
                <button type="button">Request</button>
                <button type="button">Authorize</button>
                <button type="button">Commit</button>
                <button type="button">Response</button>
              </div>
            </div>
            <div className="panel">
              <div className="scene" id="scene" data-stage="9" data-compact data-integrated>
                <div id="fallback" hidden></div>
                <span className="plate">OANRO　／　SYSTEM STUDY</span>
                <button id="orbit-cue" type="button" title="Drag the background or press to rotate">
                  ↶ Rotate
                </button>
                <div id="anchor" hidden></div>
              </div>
              <div className="steps" hidden style={{ display: "none" }} aria-hidden="true"></div>
              <p className="readout" role="status" id="status"></p>
              <details className="inspect">
                <summary>Inspect components</summary>
                <label>
                  Component <select id="part"></select>
                </label>
                <p id="description"></p>
                <label id="explodeLabel">
                  Separate layers{" "}
                  <input type="range" id="explode" min="0" max="100" defaultValue="0" />
                </label>
                <div className="tools">
                  <button id="lid-view" hidden>
                    View lid
                  </button>
                  <button id="turn">Rotate view</button>
                  <button id="move">Move component</button>
                  <button id="reset">Reset layout</button>
                  <button id="retry">Test retry</button>
                </div>
                <small id="hint">Drag a component to move it. Drag the background to rotate.</small>
              </details>
            </div>
          </section>
          <section className="booking-note" lang="bn">
            <strong>একটি বুকিং কীভাবে নিশ্চিত হয়?</strong>
            <p>
              ল্যাপটপ থেকে সময় বেছে পাঠালে গেটওয়ে পরিচয় যাচাই করে। সার্ভার খালি সময়টি পরীক্ষা
              করে বুকিং আর নিশ্চিতকরণের বার্তাটি একসঙ্গে সংরক্ষণ করে। তারপর স্ক্রিনে বুকিং নম্বর
              আসে। একই অনুরোধ আবার পাঠালেও আগের নম্বরটিই ফেরত আসে।
            </p>
          </section>
          <section className="services" id="services">
            <b>{bn ? "কীভাবে সাহায্য করতে পারি?" : "How can we help?"}</b>
            <a href={bn ? "/bn/services" : "/services"}>{text("home.ctaStudio")} ↗</a>
          </section>
          {showStore && (
            <aside id="store" data-flow="1" className="store product-stage">
              <div className="store-sign">
                <button id="store-pop" type="button" aria-label="Replay Owner Store animation">
                  <img width="44" height="44" src="/selected-home/plates/store-gold.svg" alt="" />
                  <strong>Owner Store</strong>
                </button>
                <div className="goods">
                  {storeArt.map(([id, name], index) => (
                    <StoreObject key={id} source={photos[index]?.image} label={bn ? photos[index]?.bn?.name || photos[index]?.name : photos[index]?.name} fallback={`/selected-home/home-assets/catalog/${id}.webp`} fallbackLabel={name} />
                  ))}
                </div>
              </div>
              <a href={bn ? "/bn/shop" : "/shop"}>{text("home.ctaStore")} ↗</a>
            </aside>
          )}
        </div>
      </div>
      <NativeHomeEffects />
    </>
  );
}
