import Link from "@/components/locale-link";
import { Reveal } from "@/components/experience";
import { formatPrice } from "@/lib/catalog";
import type { Locale } from "@/lib/locale-path";
import type { CheckoutRules } from "@/lib/order-store";
import { bnDigits, dayText } from "@/lib/text-format";

// Home page trust strip, "How we work" steps and FAQ. Every number comes from the owner's admin rules.
export function TrustStrip({ rules, locale }: { rules: CheckoutRules; locale: Locale }) {
  const bn = locale === "bn"; const n = (s: string) => bn ? bnDigits(s) : s;
  const fee = formatPrice(rules.deliveryCharge, locale), limit = formatPrice(rules.codLimit, locale);
  const dhaka = n(dayText(rules.dhakaDays)), outside = n(dayText(rules.outsideDays)), ret = rules.returnDays;
  const items = [
    { icon: "→", title: bn ? "সারা বাংলাদেশে ডেলিভারি" : "Delivery across Bangladesh", text: bn ? `ঢাকায় ${dhaka} দিন, বাইরে ${outside} দিন · চার্জ ${fee}` : `${dhaka} days in Dhaka, ${outside} outside · ${fee} delivery` },
    { icon: "৳", title: bn ? "যেভাবে সুবিধা, সেভাবে পেমেন্ট" : "Pay your way", text: rules.codLimit > 0 ? (bn ? `বিকাশ, নগদ, অথবা ${limit} পর্যন্ত ক্যাশ অন ডেলিভারি` : `bKash, Nagad, or cash on delivery up to ${limit}`) : (bn ? "বিকাশ বা নগদ" : "bKash or Nagad") },
    { icon: "↺", title: bn ? "ভুল বা ক্ষতিগ্রস্ত পণ্য?" : "Wrong or damaged item?", text: ret > 0 ? (bn ? `${n(String(ret))} দিনের মধ্যে জানান, আমরা বদলে দেব বা টাকা ফেরত দেব` : `Tell us within ${ret} day${ret === 1 ? "" : "s"} and we replace or refund it`) : (bn ? "ডেলিভারির দিন জানান, আমরা ঠিক করে দেব" : "Tell us on delivery day and we make it right") },
    { icon: "?", title: bn ? "মানুষের সহায়তা" : "Real people, real help", text: bn ? "মেসেঞ্জার বা ইমেইল, সাধারণত এক কর্মদিবসে উত্তর" : "Messenger or email, usually a reply within one working day" },
  ];
  return <section className="trust-strip" aria-label={bn ? "কেন OANRO" : "Why shop with OANRO"}><div className="container trust-grid">
    {items.map(item => <div className="trust-item" key={item.title}><span className="trust-icon" aria-hidden="true">{item.icon}</span><div><strong>{item.title}</strong><span>{item.text}</span></div></div>)}
  </div></section>;
}

export function HowWeWork({ locale }: { locale: Locale }) {
  const bn = locale === "bn";
  const steps = bn
    ? [["০১", "আলোচনা", "আপনার ব্যবসা ও লক্ষ্য নিয়ে ছোট একটি আলোচনা।"], ["০২", "পরিকল্পনা", "কাজের পরিধি, ধাপ ও সময়, লিখিতভাবে।"], ["০৩", "তৈরি", "নিয়মিত প্রিভিউ, যাতে অগ্রগতি দেখতে পান।"], ["০৪", "লঞ্চ", "সাইট চালু, তারপর প্রয়োজনে সহায়তা।"]]
    : [["01", "Talk", "A short conversation about your business and goals."], ["02", "Plan", "Scope, steps and timeline, written down."], ["03", "Build", "Regular previews so you see progress."], ["04", "Launch", "Go live, then support as you grow."]];
  return <section className="how-we-work container" aria-labelledby="how-title"><Reveal><h2 id="how-title">{bn ? "আমরা কীভাবে কাজ করি" : "How we work"}</h2></Reveal>
    <ol className="steps-grid">{steps.map(([num, title, text]) => <li key={num}><span>{num}</span><strong>{title}</strong><p>{text}</p></li>)}</ol>
  </section>;
}

export function HomeFaq({ rules, locale, services }: { rules: CheckoutRules; locale: Locale; services: boolean }) {
  const bn = locale === "bn"; const n = (s: string) => bn ? bnDigits(s) : s;
  const fee = formatPrice(rules.deliveryCharge, locale), limit = formatPrice(rules.codLimit, locale);
  const dhaka = n(dayText(rules.dhakaDays)), outside = n(dayText(rules.outsideDays)), ret = rules.returnDays;
  const faqs: [string, string][] = [
    bn ? ["ডেলিভারিতে কত দিন লাগে?", `পেমেন্ট নিশ্চিত হওয়ার পর ঢাকায় ${dhaka} দিন এবং ঢাকার বাইরে ${outside} দিন। ডেলিভারি চার্জ ${fee}।`] : ["How long does delivery take?", `After we confirm your payment: ${dhaka} days inside Dhaka and ${outside} days outside Dhaka. The delivery charge is ${fee}.`],
    bn ? ["কীভাবে পেমেন্ট করব?", rules.codLimit > 0 ? `বিকাশ বা নগদে (সেন্ড মানি) পেমেন্ট করে ট্রানজেকশন আইডি দিন। ${limit} পর্যন্ত অর্ডারে ক্যাশ অন ডেলিভারিও আছে, শুধু ডেলিভারি চার্জ আগে পাঠাতে হয়।` : "বিকাশ বা নগদে (সেন্ড মানি) পেমেন্ট করে চেকআউটে ট্রানজেকশন আইডি দিন।"] : ["How can I pay?", rules.codLimit > 0 ? `Pay by bKash or Nagad (Send Money) and enter the Transaction ID. Cash on delivery is available for orders up to ${limit}: you send only the delivery charge first.` : "Pay by bKash or Nagad (Send Money) and enter the Transaction ID at checkout."],
    bn ? ["ভুল বা ক্ষতিগ্রস্ত পণ্য পেলে কী হবে?", ret > 0 ? `ডেলিভারির ${n(String(ret))} দিনের মধ্যে ছবিসহ জানান। আমরা বদলে দেব বা পণ্যের দাম ফেরত দেব।` : "ডেলিভারির দিনই ছবিসহ জানান, আমরা ঠিক করে দেব।"] : ["What if an item is wrong or damaged?", ret > 0 ? `Tell us within ${ret} day${ret === 1 ? "" : "s"} of delivery with a photo. We replace it or refund the product price.` : "Contact us on the day of delivery with a photo and we will make it right."],
    ...(services ? [bn ? ["একটি ওয়েবসাইট বানাতে কত খরচ?", "কোন পেজ ও ফিচার দরকার তার ওপর নির্ভর করে। ইনকোয়ারি পাঠান, আমরা লিখিত পরিকল্পনা ও দামসহ উত্তর দেব।"] : ["How much does a website cost?", "It depends on the pages and features you need. Send an inquiry and we reply with a written plan and price."]] as [string, string][] : []),
  ];
  return <section className="home-faq container" aria-labelledby="faq-title"><h2 id="faq-title">{bn ? "প্রশ্ন ও উত্তর" : "Questions, answered"}</h2>
    {faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
    <Link className="text-link" href="/delivery-returns">{bn ? "ডেলিভারি, পেমেন্ট ও রিটার্নের সব তথ্য" : "Full delivery, payment and returns details"}</Link>
  </section>;
}
