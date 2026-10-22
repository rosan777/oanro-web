"use client";
import { areaLabel, chargeFor, type DeliveryArea } from "@/lib/delivery-fee";
import { useMemo, useState, type FormEvent } from "react";
import Link from "@/components/locale-link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { ActionIcon } from "./action-icon";
import { changeQuantity, clearCart, removeItem, useCart } from "@/lib/cart";
import { formatPrice, lineFits, optionLabel, variantSoldOut } from "@/lib/catalog";
import { resizePhoto } from "@/lib/photo-resize";
import { useProducts } from "./products-context";
import { useLocale } from "./locale";

type Method = "bkash" | "nagad";
const methodName: Record<Method, string> = { bkash: "bKash", nagad: "Nagad" };
const errorText = (bn: boolean): Record<string, string> => ({
  DISCOUNT_INVALID: bn ? "এই ডিসকাউন্ট কোডটি সঠিক নয়।" : "This discount code isn't valid.",
  DISCOUNT_EXPIRED: bn ? "এই কোডের মেয়াদ শেষ।" : "This code has expired.",
  DISCOUNT_NOT_STARTED: bn ? "এই কোড এখনো চালু হয়নি।" : "This code isn't active yet.",
  DISCOUNT_NOT_ELIGIBLE: bn ? "এই কোড আপনার ব্যাগের পণ্যগুলোর জন্য প্রযোজ্য নয়।" : "This code doesn't apply to the items in your bag.",
  DISCOUNT_USED_UP: bn ? "এই কোডের সব ব্যবহার শেষ।" : "This code has been fully used.",
  DISCOUNT_MIN_SUBTOTAL: bn ? "এই কোডের জন্য আরও কিছু পণ্য যোগ করুন।" : "Add a little more to use this code.",
  TRX_USED: bn ? "এই Transaction ID আগেই ব্যবহার হয়েছে। সঠিক ID দিন।" : "This transaction ID has already been used. Check and enter the correct one.",
  OUT_OF_STOCK: bn ? "দুঃখিত, একটি পণ্যের স্টক শেষ হয়ে গেছে। ব্যাগ থেকে সরিয়ে আবার চেষ্টা করুন।" : "Sorry, an item just sold out. Remove it from your bag and try again.",
  UNAVAILABLE: bn ? "একটি পণ্য বা সাইজ আর পাওয়া যাচ্ছে না।" : "An item or size is no longer available.",
  PRICE_CHANGED: bn ? "দাম বদলেছে। পেজটি রিফ্রেশ করে নতুন মোট দেখে নিন।" : "A price changed. Refresh the page to see the new total before paying.",
  TOO_MANY_PENDING: bn ? "আপনার ৫টি অর্ডার যাচাইয়ের অপেক্ষায় আছে। সেগুলো নিশ্চিত হলে আবার চেষ্টা করুন।" : "You already have 5 orders waiting for confirmation. Please wait for them first.",
  METHOD_UNAVAILABLE: bn ? "এই পেমেন্ট পদ্ধতি এখন বন্ধ।" : "This payment method is not available right now.",
  EMAIL_NOT_VERIFIED: bn ? "অর্ডারের আগে আপনার ইমেইল ভেরিফাই করুন।" : "Please verify your email before ordering.",
  SIGN_IN_REQUIRED: bn ? "আবার সাইন ইন করুন।" : "Please sign in again.",
  COD_LIMIT: bn ? "এই পরিমাণের অর্ডারে ক্যাশ অন ডেলিভারি নেই। bKash বা Nagad-এ পুরো টাকা দিন।" : "Cash on delivery isn't available for this amount. Pay the full amount by bKash or Nagad.",
});
const fieldText = (bn: boolean): Record<string, string> => ({
  trxId: bn ? "Transaction ID সঠিক নয় (৬–২০ অক্ষর/সংখ্যা)।" : "Enter a valid transaction ID (6–20 letters or digits).",
  payerNumber: bn ? "যে নম্বর থেকে টাকা পাঠিয়েছেন তা সঠিকভাবে দিন (01XXXXXXXXX)।" : "Enter the number you sent money from (01XXXXXXXXX).",
  phone: bn ? "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)।" : "Enter a valid mobile number (01XXXXXXXXX).",
  address: bn ? "পূর্ণ ডেলিভারি ঠিকানা দিন।" : "Enter your full delivery address.",
  name: bn ? "আপনার নাম দিন।" : "Enter your name.",
  screenshot: bn ? "স্ক্রিনশটটি ব্যবহার করা যায়নি। অন্য ছবি দিন বা বাদ দিন।" : "That screenshot couldn't be used. Try another or leave it out.",
  items: bn ? "ব্যাগে সমস্যা আছে। রিফ্রেশ করুন।" : "Something is wrong with your bag. Refresh and try again.",
});

export function CheckoutForm({ numbers, rules, name, phone, address, verified }: { numbers: Record<Method, string>; rules: { deliveryCharge: number; outsideCharge: number; codLimit: number; dhakaDays: string; outsideDays: string; returnDays: number }; name: string; phone: string; address: string; verified: boolean }) {
  const { locale } = useLocale(); const bn = locale === "bn";
  const router = useRouter();
  const cart = useCart(); const products = useProducts();
  const lines = useMemo(() => cart.flatMap(item => { const p = products.find(x => x.slug === item.slug && lineFits(x, item.size, item.color)); return p && !variantSoldOut(p, item.size, item.color) ? [{ item, p }] : []; }), [cart, products]);
  const subtotal = lines.reduce((sum, { item, p }) => sum + p.price * item.quantity, 0);
  const methods = (["bkash", "nagad"] as Method[]).filter(m => numbers[m]);
  // "prepaid": everything now by bKash/Nagad. "cod": only the delivery charge now, the product price in cash at the door.
  const [payType, setPayType] = useState<"prepaid" | "cod" | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  const codAllowed = subtotal <= rules.codLimit;
  const cod = payType === "cod";
  // Discount code: checked by the server, re-checked when the order is placed.
  const [codeInput, setCodeInput] = useState("");
  const [discount, setDiscount] = useState<{ code: string; amount: number; base: number } | null>(null);
  const [codeMsg, setCodeMsg] = useState("");
  const off = discount && discount.base === subtotal ? discount.amount : 0;
  // Delivery area decides the charge (owner sets both in admin). Must be chosen before ordering.
  const [area, setArea] = useState<DeliveryArea | null>(null);
  const fee = area ? chargeFor(rules, area) : 0;
  const payNow = cod ? fee : subtotal - off + fee, payLater = cod ? subtotal - off : 0;
  async function applyCode() {
    setCodeMsg("");
    const res = await fetch("/api/discounts/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: codeInput, items: lines.map(({ item }) => ({ slug: item.slug, quantity: item.quantity })) }) }).catch(() => null);
    const r = await res?.json().catch(() => ({})) as { amount?: number; code?: string; error?: string; min?: number } | undefined;
    if (r?.amount && r.code) { setDiscount({ code: r.code, amount: r.amount, base: subtotal }); setCodeMsg(bn ? `কোড ${r.code}: ${formatPrice(r.amount, locale)} ছাড়।` : `Code ${r.code}: ${formatPrice(r.amount, locale)} off.`); return; }
    setDiscount(null);
    setCodeMsg(r?.error === "MIN_SUBTOTAL" && r.min ? (bn ? `এই কোডের জন্য কমপক্ষে ${formatPrice(r.min, locale)}-এর পণ্য লাগবে।` : `This code needs at least ${formatPrice(r.min, locale)} of eligible products.`) : errorText(bn)[`DISCOUNT_${r?.error ?? "INVALID"}`] ?? errorText(bn).DISCOUNT_INVALID);
  }
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Not enough stock: which product, how many are left, and how many the customer asked for (all sizes).
  const [shortage, setShortage] = useState<{ slug: string; size: string | null; color: string | null; name: string; available: number; wanted: number } | null>(null);
  const [done, setDone] = useState<{ code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (done) return <section className="checkout-done" role="status"><CheckCircle2 size={48} aria-hidden="true" /><h1>{bn ? "অর্ডার জমা হয়েছে" : "Order received"}</h1>
    <p>{bn ? `অর্ডার নম্বর ${done.code}। আমরা আপনার পেমেন্ট যাচাই করছি। নিশ্চিত হলে আপনার অ্যাকাউন্টে "পেমেন্ট সফল" দেখাবে।` : `Order ${done.code}. We're checking your payment. Once confirmed, your account will show "Payment successful".`}</p>
    {cod && <p><strong>{bn ? `পণ্য হাতে পেলে ডেলিভারি ম্যানকে নগদ ${formatPrice(payLater, locale)} দেবেন।` : `Pay ${formatPrice(payLater, locale)} in cash to the delivery person when you receive the order.`}</strong></p>}
    <Link className="button brand-button" href="/account">{bn ? "আমার অর্ডার দেখুন" : "View my orders"}</Link></section>;
  if (!lines.length) return <section className="checkout-empty"><h1>{bn ? "আপনার ব্যাগ খালি" : "Your bag is empty"}</h1><Link className="button brand-button" href="/#products">{bn ? "পণ্য দেখুন" : "Browse products"}</Link></section>;
  if (!methods.length) return <section className="checkout-empty"><h1>{bn ? "অনলাইন পেমেন্ট শীঘ্রই আসছে" : "Online payment is coming soon"}</h1><p>{bn ? "এই মুহূর্তে অর্ডার নেওয়া যাচ্ছে না। পণ্য সম্পর্কে জানতে আমাদের মেসেজ করুন।" : "Orders can't be placed right now. Message us about any product."}</p><Link className="button" href="/contact">{bn ? "যোগাযোগ" : "Contact us"}</Link></section>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!area) { setError(bn ? "ডেলিভারির এলাকা বেছে নিন: ঢাকার ভেতরে না বাইরে।" : "Choose your delivery area: inside or outside Dhaka."); return; }
    if (!payType || !method) { setError(bn ? "পেমেন্ট পদ্ধতি বেছে নিন।" : "Choose how to pay."); return; }
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(""); setShortage(null);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        items: lines.map(({ item }) => ({ slug: item.slug, size: item.size, color: item.color, quantity: item.quantity })), method, paymentType: payType, expectedTotal: subtotal, deliveryArea: area, discountCode: off ? discount!.code : "",
        trxId: form.get("trxId"), payerNumber: form.get("payerNumber"), name: form.get("name"), phone: form.get("phone"), address: form.get("address"), note: form.get("note") ?? "", screenshot: shot }) });
      const result = await response.json().catch(() => ({})) as { code?: string; error?: string; field?: string; slug?: string; available?: number; color?: string; size?: string };
      if (result.error === "OUT_OF_STOCK" && result.slug && typeof result.available === "number") {
        // Per colour/size stock names the exact option; otherwise the count covers all sizes of the product.
        const exact = result.size !== undefined && result.color !== undefined;
        const mine = lines.filter(({ item }) => item.slug === result.slug && (!exact || (item.size === result.size && item.color === result.color)));
        const p = mine[0]?.p;
        const option = exact && p ? optionLabel(p, result.size!, result.color!, bn) : "";
        setShortage({ slug: result.slug, size: exact ? result.size! : null, color: exact ? result.color! : null, name: p ? `${bn && p.bn ? p.bn.name : p.name}${option ? ` (${option})` : ""}` : result.slug, available: result.available, wanted: mine.reduce((n, { item }) => n + item.quantity, 0) });
        setError(""); return;
      }
      if (response.ok && result.code) { clearCart(); setDone({ code: result.code }); router.refresh(); window.scrollTo({ top: 0 }); return; }
      setError(result.field ? fieldText(bn)[result.field] ?? (bn ? "তথ্য ঠিক করে দিন।" : "Please check the form.") : errorText(bn)[result.error ?? ""] ?? (bn ? "অর্ডার জমা হয়নি। আবার চেষ্টা করুন।" : "The order couldn't be placed. Please try again."));
    } catch { setError(bn ? "সার্ভারে পৌঁছানো যায়নি। আবার চেষ্টা করুন।" : "Couldn't reach the server. Please try again."); }
    finally { setBusy(false); }
  }
  const payTo = method ? numbers[method] : "";
  return <form className="checkout-grid" onSubmit={submit}>
    <section className="checkout-summary" aria-labelledby="summary-title">
      <h1 id="summary-title">{bn ? "চেকআউট" : "Checkout"}</h1>
      <ul>{lines.map(({ item, p }) => <li key={`${item.slug}-${item.size}-${item.color}`}><span>{bn && p.bn ? p.bn.name : p.name} <small>{optionLabel(p, item.size, item.color, bn)} × {item.quantity}</small></span><strong>{formatPrice(p.price * item.quantity, locale)}</strong></li>)}</ul>
      <p className="checkout-line"><span>{bn ? "পণ্যের দাম" : "Subtotal"}</span><span>{formatPrice(subtotal, locale)}</span></p>
      <div className="checkout-area" role="radiogroup" aria-label={bn ? "ডেলিভারির এলাকা" : "Delivery area"}>
        <span>{bn ? "ডেলিভারির এলাকা *" : "Delivery area *"}</span>
        {(["dhaka", "outside"] as DeliveryArea[]).map(a => <button key={a} type="button" role="radio" aria-checked={area === a} onClick={() => { setArea(a); setError(""); }}>
          {areaLabel(a, locale)} <small>{formatPrice(chargeFor(rules, a), locale)}</small></button>)}
      </div>
      <p className="checkout-line"><span>{bn ? "ডেলিভারি চার্জ" : "Delivery charge"}</span><span>{area ? formatPrice(fee, locale) : (bn ? "এলাকা বেছে নিন" : "Choose area")}</span></p>
      <div className="checkout-code">
        <input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} placeholder={bn ? "ডিসকাউন্ট কোড" : "Discount code"} aria-label={bn ? "ডিসকাউন্ট কোড" : "Discount code"} maxLength={20} autoComplete="off" />
        <button type="button" className="button light-button" disabled={codeInput.trim().length < 3} onClick={applyCode}>{bn ? "প্রয়োগ" : "Apply"}</button>
        {codeMsg && <p className="checkout-code-msg" role="status">{codeMsg}</p>}
      </div>
      {off > 0 && <p className="checkout-line is-discount"><span>{bn ? `ছাড় (${discount!.code})` : `Discount (${discount!.code})`}</span><span>−{formatPrice(off, locale)}</span></p>}
      <p className="checkout-total"><span>{bn ? "মোট" : "Total"}</span><strong>{formatPrice(subtotal - off + fee, locale)}</strong></p>
      {cod && <div className="checkout-split" role="status">
        <p><span>{bn ? "এখন দিচ্ছেন (bKash/Nagad)" : "Pay now (bKash/Nagad)"}</span><strong>{formatPrice(payNow, locale)}</strong></p>
        <p><span>{bn ? "ডেলিভারির সময় নগদ" : "Cash on delivery"}</span><strong>{formatPrice(payLater, locale)}</strong></p>
      </div>}
      <small>{bn ? <>ডেলিভারি চার্জ ফেরতযোগ্য নয়। ঢাকায় {rules.dhakaDays.replace("-", "–").replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)])} দিন, ঢাকার বাইরে {rules.outsideDays.replace("-", "–").replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)])} দিন। <Link href="/delivery-returns" target="_blank">ডেলিভারি ও রিটার্ন নীতি</Link></> : <>The delivery charge is non-refundable. Delivery in {rules.dhakaDays.replace("-", "–")} days inside Dhaka, {rules.outsideDays.replace("-", "–")} outside. <Link href="/delivery-returns" target="_blank">Delivery &amp; returns policy</Link></>}</small>
    </section>
    <section className="checkout-pay" aria-labelledby="pay-title">
      {!verified && <p className="checkout-warning" role="alert"><ShieldAlert size={18} />{bn ? "অর্ডার দিতে আগে আপনার ইমেইল ভেরিফাই করুন (ইনবক্সে লিংক দেখুন)।" : "Verify your email first (check your inbox for the link) to place an order."}</p>}
      <h2 id="pay-title">{bn ? "১. পেমেন্ট পদ্ধতি বেছে নিন" : "1. Choose how to pay"}</h2>
      <div className="pay-methods" role="radiogroup" aria-label={bn ? "পেমেন্ট পদ্ধতি" : "Payment method"}>
        {methods.map(m => <button type="button" role="radio" aria-checked={payType === "prepaid" && method === m} key={m} className={`pay-method pay-${m}`} onClick={() => { setPayType("prepaid"); setMethod(m); setError(""); }}>{methodName[m]}</button>)}
        <button type="button" role="radio" aria-checked={cod} aria-disabled={!codAllowed} className="pay-method pay-cod" onClick={() => { if (!codAllowed) { setError(errorText(bn).COD_LIMIT); return; } setPayType("cod"); setMethod(methods.length === 1 ? methods[0] : null); setError(""); }}>{bn ? "ক্যাশ অন ডেলিভারি" : "Cash on delivery"}</button>
      </div>
      {!codAllowed && <small className="pay-hint">{bn ? `ক্যাশ অন ডেলিভারি সর্বোচ্চ ${formatPrice(rules.codLimit, locale)} পর্যন্ত।` : `Cash on delivery is available up to ${formatPrice(rules.codLimit, locale)}.`}</small>}
      {cod && <div className="cod-box">
        <p className="pay-notice cod-notice" role="note"><ShieldAlert size={18} />{bn ? "আগে ডেলিভারি চার্জ দিতে হবে, তারপর আমাদের অ্যাডমিন অর্ডারটি অনুমোদন করবে।" : "You must pay the delivery charge first, and your order needs approval from our admin."}</p>
        <h3>{bn ? `ডেলিভারি চার্জ ${formatPrice(fee, locale)} পাঠান` : `Pay the delivery charge (${formatPrice(fee, locale)})`}</h3>
        <div className="pay-methods" role="radiogroup" aria-label={bn ? "ডেলিভারি চার্জ কীভাবে দেবেন" : "Pay the delivery charge with"}>{methods.map(m => <button type="button" role="radio" aria-checked={method === m} key={m} className={`pay-method pay-${m}`} onClick={() => { setMethod(m); setError(""); }}>{methodName[m]}</button>)}</div>
      </div>}
      {payType && method && <div className="pay-instructions">
        <h2>{bn ? `২. ${methodName[method]}-এ Send Money করুন` : `2. Send Money with ${methodName[method]}`}</h2>
        <dl><div><dt>{bn ? "যে নম্বরে পাঠাবেন (পার্সোনাল)" : "Send to (personal number)"}</dt><dd><strong>{payTo}</strong><button type="button" className="btn btn-neutral btn-sm" onClick={() => { void navigator.clipboard?.writeText(payTo).then(() => setCopied(true)); }}><ActionIcon name={copied ? "approve" : "copy"} size={14} />{copied ? (bn ? "কপি হয়েছে" : "Copied") : bn ? "কপি" : "Copy"}</button></dd></div>
          <div><dt>{bn ? (cod ? "পরিমাণ (শুধু ডেলিভারি চার্জ)" : "পরিমাণ (পণ্য + ডেলিভারি)") : cod ? "Amount (delivery charge only)" : "Amount (products + delivery)"}</dt><dd><strong>{formatPrice(payNow, locale)}</strong></dd></div></dl>
        <p className="pay-notice" role="note"><ShieldAlert size={18} />{bn ? "টাকা পাঠানোর পর নিচে Transaction ID দিতে হবে (বাধ্যতামূলক)। চাইলে পেমেন্টের স্ক্রিনশটও দিতে পারেন। তাই পাঠানোর পর মেসেজটি বন্ধ করবেন না।" : "After sending, you must enter the Transaction ID below (required). You can also add a screenshot of the payment. Keep the confirmation message open until you finish."}</p>
        <h2>{bn ? "৩. পেমেন্টের প্রমাণ ও ডেলিভারি তথ্য" : "3. Payment proof and delivery details"}</h2>
        <div className="checkout-fields">
          <label>{bn ? "Transaction ID *" : "Transaction ID *"}<input name="trxId" required minLength={6} maxLength={20} autoCapitalize="characters" autoComplete="off" placeholder="8F7A3K9D2X" /></label>
          <label>{bn ? `যে ${methodName[method]} নম্বর থেকে পাঠিয়েছেন *` : `Your ${methodName[method]} number (sent from) *`}<input name="payerNumber" required inputMode="tel" placeholder="01XXXXXXXXX" /></label>
          <label>{bn ? "স্ক্রিনশট (ঐচ্ছিক)" : "Screenshot (optional)"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e => { const f = e.currentTarget.files?.[0]; if (!f) return; try { setShot(await resizePhoto(f, 1000)); setError(""); } catch (err) { setError(err instanceof Error ? err.message : "Photo error"); } }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {shot && <span className="shot-preview"><img src={shot} alt={bn ? "পেমেন্ট স্ক্রিনশট" : "Payment screenshot preview"} /><button type="button" className="btn btn-danger btn-sm" onClick={() => setShot(null)}><ActionIcon name="remove" size={14} />{bn ? "সরান" : "Remove"}</button></span>}</label>
          <label>{bn ? "আপনার নাম *" : "Your name *"}<input name="name" required minLength={2} maxLength={80} defaultValue={name} autoComplete="name" /></label>
          <label>{bn ? "মোবাইল নম্বর (ডেলিভারির জন্য) *" : "Mobile number (for delivery) *"}<input name="phone" required inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" defaultValue={phone} /></label>
          <label className="wide">{bn ? "ডেলিভারি ঠিকানা *" : "Delivery address *"}<textarea name="address" required minLength={10} maxLength={300} rows={3} autoComplete="street-address" defaultValue={address} /></label>
          <label className="wide">{bn ? "নোট (ঐচ্ছিক)" : "Note (optional)"}<textarea name="note" maxLength={300} rows={2} /></label>
        </div>
        {error && <p className="checkout-error" role="alert">{error}</p>}
        {shortage && (() => { const one = lines.filter(({ item }) => item.slug === shortage.slug && (shortage.size === null || (item.size === shortage.size && item.color === shortage.color))); return <div className="stock-shortage" role="alert">
          <p><strong>{bn ? "দুঃখিত, পর্যাপ্ত স্টক নেই।" : "Sorry, we don't have enough in stock."}</strong> {shortage.available === 0
            ? (bn ? `"${shortage.name}" এখন স্টকে নেই। ব্যাগ থেকে সরিয়ে আবার চেষ্টা করুন।` : `"${shortage.name}" is out of stock right now. Remove it from your bag to continue.`)
            : (bn ? `"${shortage.name}" এখন মাত্র ${shortage.available}টি আছে, আপনি ${shortage.wanted}টি চেয়েছেন। সর্বোচ্চ ${shortage.available}টি অর্ডার করতে পারবেন।` : `Only ${shortage.available} of "${shortage.name}" left, and you asked for ${shortage.wanted}. You can order up to ${shortage.available}.`)}</p>
          {shortage.available > 0 && one.length === 1
            ? <button type="button" className="btn btn-primary btn-sm" onClick={() => { const { item } = one[0]; changeQuantity(item.slug, item.size, shortage.available - item.quantity, item.color); setShortage(null); }}><ActionIcon name="approve" size={14} />{bn ? `${shortage.available}টি করে দিন` : `Change to ${shortage.available}`}</button>
            : shortage.available === 0 ? <button type="button" className="btn btn-danger btn-sm" onClick={() => { one.forEach(({ item }) => removeItem(item.slug, item.size, item.color)); setShortage(null); }}><ActionIcon name="remove" size={14} />{bn ? "ব্যাগ থেকে সরান" : "Remove from bag"}</button>
            : <small>{bn ? "উপরের ব্যাগে সাইজগুলো মিলিয়ে সংখ্যা কমিয়ে নিন।" : "Reduce the quantities in your bag (all sizes together) to continue."}</small>}
          <p className="shortage-refund">{bn
            ? <>ইতিমধ্যে টাকা পাঠিয়ে থাকলে চিন্তা করবেন না। একই Transaction ID দিয়েই অর্ডার জমা দিন। নতুন মোটের চেয়ে বেশি পাঠিয়ে থাকলে, যাচাইয়ের পর বাড়তি টাকা যে নম্বর থেকে পাঠিয়েছেন সেই নম্বরেই ফেরত দেব। কোনো প্রশ্ন থাকলে <Link href="/contact">আমাদের সাথে যোগাযোগ করুন</Link>।</>
            : <>Already sent the payment? Don&apos;t worry. Submit with the same Transaction ID. If you paid more than the new total, we&apos;ll return the difference to the number you paid from once we&apos;ve checked it. Questions? <Link href="/contact">Contact us</Link>.</>}</p>
        </div>; })()}
        {/* Digital Commerce Guidelines 2021: prior consent before collecting personal data. */}
        <label className="consent-check"><input type="checkbox" name="consent" required /><span>{bn ? <>আমি OANRO-র <Link href="/privacy" target="_blank">প্রাইভেসি নোটিশ</Link> পড়েছি এবং আমার তথ্য ব্যবহারে সম্মতি দিচ্ছি।</> : <>I have read the <Link href="/privacy" target="_blank">Privacy notice</Link> and agree to OANRO using my details for this purpose.</>}</span></label>
        {/* Digital Commerce Guidelines 2021: prior consent before collecting personal data. */}
        <label className="consent-check"><input type="checkbox" name="consent" required /><span>{bn ? <>আমি OANRO-র <Link href="/privacy" target="_blank">প্রাইভেসি নোটিশ</Link> পড়েছি এবং আমার তথ্য ব্যবহারে সম্মতি দিচ্ছি।</> : <>I have read the <Link href="/privacy" target="_blank">Privacy notice</Link> and agree to OANRO using my details for this purpose.</>}</span></label>
        <button className="button brand-button checkout-submit" disabled={busy || !verified}>{busy ? (bn ? "জমা হচ্ছে…" : "Submitting…") : bn ? `পেমেন্ট জমা দিন · ${formatPrice(payNow, locale)}` : `Submit payment · ${formatPrice(payNow, locale)}`}</button>
      </div>}
    </section>
  </form>;
}
