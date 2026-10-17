// Labels for the order timeline, shared by the admin and customer screens (pure data).
export const stageText: Record<string, [string, string]> = {
  placed: ["Order placed", "অর্ডার দেওয়া হয়েছে"],
  paid: ["Payment confirmed", "পেমেন্ট নিশ্চিত হয়েছে"],
  rejected: ["Payment not confirmed", "পেমেন্ট নিশ্চিত হয়নি"],
  processing: ["Preparing your order", "অর্ডার প্রস্তুত হচ্ছে"],
  shipped: ["Handed to courier", "কুরিয়ারে দেওয়া হয়েছে"],
  out_for_delivery: ["Out for delivery", "ডেলিভারির পথে"],
  delivered: ["Delivered", "ডেলিভারি সম্পন্ন"],
  returned: ["Returned", "ফেরত এসেছে"],
  cash_collected: ["Cash received", "নগদ টাকা পাওয়া গেছে"],
};
/** The happy path a customer sees as a progress bar. */
export const deliveryPath = ["paid", "shipped", "out_for_delivery", "delivered"] as const;
