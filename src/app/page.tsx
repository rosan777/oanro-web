import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, MessageCircle } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";
import { FeatureStory, ProductConveyor, ServiceConveyor, StandardPanel, ValueFan } from "@/components/home-experience";
import { Reveal } from "@/components/experience";
import { DoubleConveyor } from "@/components/double-conveyor";

export default function Home() {
  const config = getSiteConfig();
  return <main id="main-content">
    <section className="opening"><div className="container opening-layout"><Reveal className="opening-brand"><div className="holographic-mark"><Image src="/logo.svg" alt="" width={88} height={88} /></div><div><p className="eyebrow">Welcome to the first chapter</p><h1>OANRO</h1><p>Considered products.<br />Practical possibilities.</p></div></Reveal><StandardPanel /></div></section>
    <ValueFan showProducts={config.products} />
    <nav className="discovery-nav container" aria-label="Explore OANRO">{config.products && <Link href="#products">Explore products<ArrowUpRight size={17} /></Link>}{config.services && <Link href="#services">Explore services<ArrowUpRight size={17} /></Link>}<Link href="#about">Discover OANRO<ArrowUpRight size={17} /></Link></nav>
    {config.features && <FeatureStory />}
    {config.products && <ProductConveyor />}
    {config.services && <ServiceConveyor />}
    <DoubleConveyor showProducts={config.products} showServices={config.services} />
    {config.partners && <section id="partners" className="partners-section section-space"><Reveal className="container partner-layout"><div><p className="eyebrow">Partner Picks</p><h2>Good finds.<br />Wider possibilities.</h2></div><div><span className="outline-label">A separate selection</span><p>A dedicated space for selected partner offerings, brought together through OANRO.</p><small>Our first partner selection is taking shape.</small></div></Reveal></section>}
    <section id="about" className="about-section section-space"><div className="container"><Reveal className="section-heading"><div><p className="eyebrow">Our approach</p><h2>Thoughtful from the start.</h2></div><p>Useful choices. Clear information.<br />People at the center.</p></Reveal><div className="about-grid"><article><h3>Clarity first.</h3><p>Understand what you are choosing and what happens next.</p></article><article><h3>Useful by design.</h3><p>Products and technology with a practical place in everyday life.</p></article><article><h3>Room to grow.</h3><p>Starting in Bangladesh, with a wider world of possibilities ahead.</p></article></div>
      <div id="contact" className="contact-section"><div><p className="eyebrow">Contact OANRO</p><h2>Let&apos;s start<br />a conversation.</h2></div><div><p>Have a question about a product, a service, or a partnership?</p><div className="contact-actions">{config.messengerUrl && <a className="button brand-button" href={config.messengerUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} />Message OANRO</a>}{config.contactEmail && <a className="button light-button" href={`mailto:${config.contactEmail}`}><Mail size={17} />{config.contactEmail}</a>}</div>{!config.whatsappUrl && <p className="contact-pending">WhatsApp contact is being prepared.</p>}<small>Design preview: sample products and images. Ordering is not yet open.</small></div></div>
    </div></section>
  </main>;
}
