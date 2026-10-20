import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal-page";
import { InquiryForm } from "@/components/inquiry-form";
import { getSiteConfig } from "@/lib/site-config";
import { FormPopup } from "@/components/form-popup";
import { Localized } from "@/components/locale";
export const metadata: Metadata = { title: "Privacy notice", description: "What personal information OANRO collects, why, and how to access or delete it." };
export default function PrivacyPage() {
  const email = getSiteConfig().contactEmail;
  // Describes what the code actually stores. Have it reviewed by a legal adviser before relying on it.
  const sections: LegalSection[] = [
    { en: ["What we collect", ["When you send an inquiry: the name, phone number, email, message, product and size you type, and the time you agreed to this notice.", "If you create an account: your name and email, and your Google name and picture if you sign in with Google. Passwords are stored only in scrambled (hashed) form.", "To stop spam, we keep a one-way scrambled code made from your internet address with each inquiry. We never store the address itself.", "We count how many times each product page is opened per day, so we can show popular products in search. Only the total number is stored: not who viewed it, nor any internet address or device.", "Your language choice and demo bag are saved only in your own browser, not on our servers. When you are signed in, a secure session cookie keeps you signed in."]],
      bn: ["আমরা যে তথ্য সংগ্রহ করি", ["আপনি জিজ্ঞাসা পাঠালে: আপনার লেখা নাম, ফোন নম্বর, ইমেইল, বার্তা, পণ্য ও সাইজ, এবং এই নোটিশে সম্মতির সময়।", "অ্যাকাউন্ট খুললে: আপনার নাম ও ইমেইল; Google দিয়ে সাইন ইন করলে Google-এর নাম ও ছবি। পাসওয়ার্ড শুধু এনক্রিপ্টেড (হ্যাশড) আকারে রাখা হয়।", "স্প্যাম ঠেকাতে প্রতিটি জিজ্ঞাসার সঙ্গে আপনার ইন্টারনেট ঠিকানা থেকে তৈরি একটি একমুখী সাংকেতিক কোড রাখা হয়। ঠিকানাটি নিজে কখনো সংরক্ষণ করা হয় না।", "সার্চে জনপ্রিয় পণ্য দেখাতে আমরা প্রতিদিন প্রতিটি পণ্যের পেজ কতবার খোলা হলো তা গুনি। শুধু মোট সংখ্যা রাখা হয়: কে দেখেছে, ইন্টারনেট ঠিকানা বা ডিভাইস কিছুই না।", "ভাষা ও ডেমো ব্যাগের তথ্য শুধু আপনার নিজের ব্রাউজারে থাকে, আমাদের সার্ভারে নয়। সাইন ইন থাকলে একটি নিরাপদ সেশন কুকি ব্যবহার হয়।"]] },
    { en: ["Why we use it", ["To reply to your inquiry, run your account and keep the website secure. We do not sell your information and we do not use advertising trackers."]],
      bn: ["কেন ব্যবহার করি", ["আপনার জিজ্ঞাসার উত্তর দিতে, অ্যাকাউন্ট চালাতে ও ওয়েবসাইট নিরাপদ রাখতে। আমরা আপনার তথ্য বিক্রি করি না এবং বিজ্ঞাপনের ট্র্যাকার ব্যবহার করি না।"]] },
    { en: ["Who can see it", ["Only OANRO staff who handle inquiries. Our hosting and database providers (Vercel and Neon) store the data for us, our email provider sends account emails, and Google is involved only if you choose Google sign-in."]],
      bn: ["কারা দেখতে পারে", ["শুধু জিজ্ঞাসা দেখাশোনা করা OANRO কর্মীরা। আমাদের হোস্টিং ও ডেটাবেস সেবাদাতা (Vercel ও Neon) তথ্য সংরক্ষণ করে, ইমেইল সেবাদাতা অ্যাকাউন্টের ইমেইল পাঠায়, আর আপনি Google সাইন-ইন বেছে নিলে শুধু তখনই Google যুক্ত থাকে।"]] },
    { en: ["How long we keep it", ["Inquiries are kept for up to 24 months, then deleted or anonymised. Account information is kept until you delete your account or ask us to. When an account is deleted, your name, email, phone, addresses and sign-in are erased; past orders are kept without your personal details because we must keep sales records."]],
      bn: ["কতদিন রাখি", ["জিজ্ঞাসা সর্বোচ্চ ২৪ মাস রাখা হয়, তারপর মুছে ফেলা বা পরিচয়হীন করা হয়। অ্যাকাউন্টের তথ্য আপনি অ্যাকাউন্ট না মোছা বা মুছতে না বলা পর্যন্ত থাকে। অ্যাকাউন্ট মুছলে আপনার নাম, ইমেইল, ফোন, ঠিকানা ও সাইন-ইন মুছে যায়; বিক্রির হিসাব রাখতে হয় বলে আগের অর্ডারগুলো আপনার ব্যক্তিগত তথ্য ছাড়া থেকে যায়।"]] },
    { en: ["Your choices", [`You can delete your account yourself on My account (bottom of the page). You can also ask for a copy of your information, ask us to correct it, or ask us to delete it, using the form below${email ? ` or by emailing ${email}` : ""}. We confirm it's you, then reply within 30 days.`]],
      bn: ["আপনার অধিকার", [`My account পেজের নিচ থেকে আপনি নিজেই অ্যাকাউন্ট মুছে ফেলতে পারেন। এছাড়া নিচের ফর্ম${email ? ` বা ${email} ঠিকানায় ইমেইল` : ""} ব্যবহার করে আপনি আপনার তথ্যের কপি চাইতে, সংশোধন করতে বা মুছে ফেলতে বলতে পারেন। আপনার পরিচয় নিশ্চিত করে ৩০ দিনের মধ্যে আমরা উত্তর দেব।`]] },
  ];
  return <LegalPage title={["Privacy notice", "প্রাইভেসি নোটিশ"]} updated="18 October 2026" intro={["This notice explains, in plain words, what OANRO does with your personal information.", "OANRO আপনার ব্যক্তিগত তথ্য নিয়ে কী করে, তা সহজ ভাষায় এই নোটিশে বলা হয়েছে।"]} sections={sections}>
    <section id="request"><FormPopup label={<Localized en="Send a privacy request" bn="প্রাইভেসি অনুরোধ পাঠান" />} dialogLabel="Privacy request"><InquiryForm kind="privacy" /></FormPopup></section>
  </LegalPage>;
}
