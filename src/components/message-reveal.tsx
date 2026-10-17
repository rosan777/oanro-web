"use client";
import { ContactInquiry } from "./contact-inquiry";
import { FormPopup } from "./form-popup";
import { useT } from "./locale";

/** Homepage and contact page: "Message OANRO" opens the general inquiry form as a pop-up. */
export function MessageReveal() {
  const t = useT();
  return <FormPopup label={t("Message OANRO", "OANRO-কে মেসেজ করুন")} dialogLabel={t("Send us a message", "আমাদের বার্তা পাঠান")}><ContactInquiry /></FormPopup>;
}
