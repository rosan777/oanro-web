import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal-page";
export const metadata: Metadata = { title: "Terms of use", description: "The terms for using the OANRO website, product information and inquiries." };
const sections: LegalSection[] = [
  { en: ["Product information", ["We describe products as accurately as we can. Some images are samples or illustrations, and the product page says so. Colours can look different on different screens."]], bn: ["পণ্যের তথ্য", ["আমরা যতটা সম্ভব সঠিকভাবে পণ্যের বর্ণনা দিই। কিছু ছবি নমুনা বা ইলাস্ট্রেশন, এবং পণ্যের পেজে তা উল্লেখ থাকে। স্ক্রিনভেদে রং কিছুটা আলাদা দেখাতে পারে।"]] },
  { en: ["Prices and availability", ["Prices are in Bangladeshi Taka (৳). Price, stock and delivery charges are confirmed by us before any order. An item marked out of stock can't be ordered until it's back."]], bn: ["মূল্য ও প্রাপ্যতা", ["মূল্য বাংলাদেশি টাকায় (৳)। যেকোনো অর্ডারের আগে মূল্য, স্টক ও ডেলিভারি চার্জ আমরা নিশ্চিত করি। স্টক শেষ চিহ্নিত পণ্য আবার না আসা পর্যন্ত অর্ডার করা যাবে না।"]] },
  { en: ["Inquiries and orders", ["Sending an inquiry is not a purchase. An order exists only after we contact you and you confirm the details. Online payment is not available yet."]], bn: ["জিজ্ঞাসা ও অর্ডার", ["জিজ্ঞাসা পাঠানো মানে কেনাকাটা নয়। আমরা যোগাযোগ করার পর আপনি বিস্তারিত নিশ্চিত করলেই কেবল অর্ডার হয়। অনলাইন পেমেন্ট এখনো চালু হয়নি।"]] },
  { en: ["Delivery and returns", ["Delivery areas, timing, and return or exchange conditions are explained to you before you confirm an order."]], bn: ["ডেলিভারি ও রিটার্ন", ["অর্ডার নিশ্চিত করার আগে ডেলিভারি এলাকা, সময় এবং রিটার্ন বা এক্সচেঞ্জের শর্ত আপনাকে জানানো হয়।"]] },
  { en: ["Using this website", ["Please don't misuse the website, try to break its security, or copy its content and images without permission. The OANRO name and logo belong to OANRO."]], bn: ["ওয়েবসাইট ব্যবহার", ["ওয়েবসাইটের অপব্যবহার, নিরাপত্তা ভাঙার চেষ্টা বা অনুমতি ছাড়া কনটেন্ট ও ছবি কপি করবেন না। OANRO নাম ও লোগো OANRO-র মালিকানাধীন।"]] },
  { en: ["Law", ["These terms are governed by the laws of Bangladesh. We may update them; the date above shows the latest version."]], bn: ["আইন", ["এই শর্তাবলি বাংলাদেশের আইন অনুযায়ী পরিচালিত। আমরা এগুলো হালনাগাদ করতে পারি; উপরের তারিখে সর্বশেষ সংস্করণ দেখা যাবে।"]] },
];
export default function TermsPage() {
  return <LegalPage title={["Terms of use", "ব্যবহারের শর্তাবলি"]} updated="16 October 2026" intro={["By using this website you agree to these terms.", "এই ওয়েবসাইট ব্যবহার করলে আপনি এই শর্তাবলিতে সম্মত হচ্ছেন।"]} sections={sections} />;
}
