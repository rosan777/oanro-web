import type { Metadata } from "next";
import { OrderTracker } from "@/components/order-tracker";
export const metadata: Metadata = { title: "Track your order", description: "Enter your OANRO order number and phone number to see where your order is." };

export default function TrackPage() {
  return <main id="main-content" className="container track-page"><OrderTracker /></main>;
}
