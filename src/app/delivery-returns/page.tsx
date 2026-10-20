import type { Metadata } from "next";
import { requestLocale } from "@/lib/request-locale";
import Link from "@/components/locale-link";
import { LegalPage, type LegalSection } from "@/components/legal-page";
import { DEFAULT_RULES, getCheckoutRules } from "@/lib/order-store";
import { catalogDb } from "@/lib/store-products";
import { formatPrice } from "@/lib/catalog";
// Title and description follow the page language (/bn = Bangla) so both versions can rank.
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await requestLocale();
  return locale === "bn" ? { title: "ডেলিভারি, পেমেন্ট ও রিটার্ন", description: "OANRO-র ডেলিভারি চার্জ ও সময়, বিকাশ/নগদ ও ক্যাশ অন ডেলিভারি, বাতিল, রিটার্ন ও রিফান্ডের নিয়ম।" } : { title: "Delivery, payment and returns", description: "Delivery charge and times, bKash/Nagad and cash on delivery, cancellations, returns and refunds at OANRO." };
}
export const dynamic = "force-dynamic";

// Every number here comes from the owner's "Delivery & payment rules" in the admin, so this page never goes out of date.
const bnNum = (s: string) => s.replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)]);
export default async function DeliveryReturnsPage() {
  const r = process.env.DATABASE_URL ? await getCheckoutRules(catalogDb()).catch(() => DEFAULT_RULES) : DEFAULT_RULES;
  const fee = formatPrice(r.deliveryCharge), feeBn = formatPrice(r.deliveryCharge, "bn");
  const limit = formatPrice(r.codLimit), limitBn = formatPrice(r.codLimit, "bn");
  const dhaka = r.dhakaDays.replace("-", "–"), outside = r.outsideDays.replace("-", "–");
  const ret = r.returnDays;
  const sections: LegalSection[] = [
    { en: ["Delivery charge", [`Every order has a delivery charge of ${fee}. It is shown at checkout before you pay, and it is not refundable once your order is confirmed, including when an order is refused at the door or returned, because the courier has already been paid.`]],
      bn: ["ডেলিভারি চার্জ", [`প্রতিটি অর্ডারে ডেলিভারি চার্জ ${feeBn}। পেমেন্টের আগেই চেকআউটে এটি দেখানো হয়। অর্ডার নিশ্চিত হওয়ার পর এই চার্জ ফেরতযোগ্য নয়, অর্ডার দরজায় গ্রহণ না করলে বা ফেরত এলেও নয়, কারণ কুরিয়ারকে ইতিমধ্যে টাকা দেওয়া হয়ে যায়।`]] },
    { en: ["Delivery time", [`After we confirm your payment: ${dhaka} days inside Dhaka and ${outside} days outside Dhaka. Public holidays, bad weather or courier delays can add a little time.`, "You can follow every step (preparing, handed to courier, out for delivery, delivered) in My account → My orders, and we also email you at each step."]],
      bn: ["ডেলিভারির সময়", [`পেমেন্ট নিশ্চিত হওয়ার পর: ঢাকার ভিতরে ${bnNum(dhaka)} দিন, ঢাকার বাইরে ${bnNum(outside)} দিন। সরকারি ছুটি, খারাপ আবহাওয়া বা কুরিয়ারের দেরিতে একটু বেশি সময় লাগতে পারে।`, "প্রতিটি ধাপ (প্রস্তুত হচ্ছে, কুরিয়ারে দেওয়া হয়েছে, ডেলিভারির পথে, পৌঁছেছে) My account → My orders-এ দেখতে পাবেন, আর প্রতিটি ধাপে আমরা ইমেইলও পাঠাই।"]] },
    { en: ["How to pay", ["bKash or Nagad (Send Money): send the full amount, products plus delivery, to the personal number shown at checkout, then enter the Transaction ID. A screenshot is optional.",
        r.codLimit > 0 ? `Cash on delivery: available for orders up to ${limit}. You first send only the delivery charge (${fee}) by bKash or Nagad; after our admin approves it, you pay the product price in cash when the order arrives.` : "Cash on delivery is not available at the moment.",
        "We never ask for your PIN, OTP or password. Don't share them with anyone, including people who say they are from OANRO."]],
      bn: ["কীভাবে পেমেন্ট করবেন", ["bKash বা Nagad (Send Money): চেকআউটে দেখানো পার্সোনাল নম্বরে পুরো টাকা (পণ্য + ডেলিভারি) পাঠান, তারপর Transaction ID দিন। স্ক্রিনশট দেওয়া ঐচ্ছিক।",
        r.codLimit > 0 ? `ক্যাশ অন ডেলিভারি: ${limitBn} পর্যন্ত অর্ডারে পাওয়া যায়। আগে শুধু ডেলিভারি চার্জ (${feeBn}) bKash বা Nagad-এ পাঠাবেন; অ্যাডমিন অনুমোদন দিলে পণ্য হাতে পেয়ে নগদে দাম দেবেন।` : "এই মুহূর্তে ক্যাশ অন ডেলিভারি চালু নেই।",
        "আমরা কখনো আপনার PIN, OTP বা পাসওয়ার্ড চাই না। কাউকে দেবেন না, এমনকি OANRO-র নাম বললেও না।"]] },
    { en: ["Payment check and overpayment", ["We check every payment in our bKash/Nagad app before confirming the order. If the Transaction ID can't be found, the order is not confirmed and we tell you why.",
        "If you sent more than the order total, or an item ran out of stock after you paid, we return the extra amount to the same number you paid from, usually within 3 working days of checking it."]],
      bn: ["পেমেন্ট যাচাই ও বাড়তি টাকা", ["অর্ডার নিশ্চিত করার আগে আমরা bKash/Nagad অ্যাপে প্রতিটি পেমেন্ট যাচাই করি। Transaction ID পাওয়া না গেলে অর্ডার নিশ্চিত হয় না, আর কারণ জানিয়ে দিই।",
        "অর্ডারের মোটের চেয়ে বেশি পাঠালে বা পেমেন্টের পর কোনো পণ্যের স্টক শেষ হয়ে গেলে, বাড়তি টাকা যে নম্বর থেকে পাঠিয়েছেন সেই নম্বরেই ফেরত দিই, সাধারণত যাচাইয়ের ৩ কর্মদিবসের মধ্যে।"]] },
    { en: ["Cancelling an order", ["You can cancel before the order is handed to the courier: contact us and we refund the product price. The delivery charge is not refunded.", "Once the order is on its way it can't be cancelled. Refusing a cash-on-delivery order at the door is treated as a cancellation."]],
      bn: ["অর্ডার বাতিল", ["কুরিয়ারে দেওয়ার আগে পর্যন্ত বাতিল করা যায়: আমাদের জানান, পণ্যের দাম ফেরত দেব। ডেলিভারি চার্জ ফেরত হবে না।", "অর্ডার রওনা হওয়ার পর আর বাতিল করা যায় না। ক্যাশ অন ডেলিভারি অর্ডার দরজায় গ্রহণ না করলে সেটি বাতিল হিসেবে ধরা হয়।"]] },
    { en: ["Returns and exchanges", ret > 0
        ? [`If you receive a wrong, damaged or missing item, tell us within ${ret} day${ret === 1 ? "" : "s"} of delivery with a photo. We will replace it or refund the product price, and we cover the return delivery.`, "Items must be unused and in their original packaging. For hygiene reasons, earrings and nose pins can only be returned if they are faulty or wrong.", "Change-of-mind returns are not accepted at the moment."]
        : ["We don't accept returns at the moment. If you receive a wrong or damaged item, contact us on the day of delivery with a photo and we will make it right."]],
      bn: ["রিটার্ন ও এক্সচেঞ্জ", ret > 0
        ? [`ভুল, ক্ষতিগ্রস্ত বা অনুপস্থিত পণ্য পেলে ডেলিভারির ${bnNum(String(ret))} দিনের মধ্যে ছবিসহ জানান। আমরা বদলে দেব বা পণ্যের দাম ফেরত দেব, আর ফেরত পাঠানোর খরচ আমরাই বহন করব।`, "পণ্য অব্যবহৃত ও আসল প্যাকেটে থাকতে হবে। স্বাস্থ্যগত কারণে কানের দুল ও নাকফুল শুধু ত্রুটিপূর্ণ বা ভুল হলেই ফেরত নেওয়া হয়।", "মত বদলের কারণে রিটার্ন এই মুহূর্তে নেওয়া হয় না।"]
        : ["এই মুহূর্তে রিটার্ন নেওয়া হয় না। ভুল বা ক্ষতিগ্রস্ত পণ্য পেলে ডেলিভারির দিনই ছবিসহ জানান, আমরা সমাধান করব।"]] },
    { en: ["Refunds", ["Refunds go to the bKash or Nagad number you paid from. The delivery charge is refunded only when the mistake was ours (wrong or damaged item)."]],
      bn: ["রিফান্ড", ["রিফান্ড যায় যে bKash বা Nagad নম্বর থেকে পেমেন্ট করেছেন সেখানে। ডেলিভারি চার্জ ফেরত দেওয়া হয় শুধু আমাদের ভুলের ক্ষেত্রে (ভুল বা ক্ষতিগ্রস্ত পণ্য)।"]] },
  ];
  return <LegalPage title={["Delivery, payment and returns", "ডেলিভারি, পেমেন্ট ও রিটার্ন"]} updated="18 October 2026"
    intro={["Everything you need to know before you order: charges, delivery times, how to pay, and what happens if something goes wrong.", "অর্ডারের আগে যা জানা দরকার: চার্জ, ডেলিভারির সময়, পেমেন্টের নিয়ম, আর কোনো সমস্যা হলে কী হবে।"]} sections={sections}>
    <p><Link className="text-link" href="/contact">Questions about a payment or order? Contact us (choose “Payment, refund or order question”)</Link></p>
  </LegalPage>;
}
