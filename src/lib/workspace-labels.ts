// English and Bangla labels for Workspace statuses, shared by customer and admin screens. Pure data.

const projectStatus: Record<string, [string, string]> = {
  planning: ["Planning", "পরিকল্পনা"],
  in_progress: ["In progress", "কাজ চলছে"],
  in_review: ["In review", "রিভিউতে"],
  completed: ["Completed", "সম্পন্ন"],
  on_hold: ["On hold", "স্থগিত"],
  cancelled: ["Cancelled", "বাতিল"],
};
const milestoneStatus: Record<string, [string, string]> = {
  todo: ["Up next", "পরবর্তী"],
  in_progress: ["In progress", "কাজ চলছে"],
  in_review: ["In review", "রিভিউতে"],
  done: ["Done", "সম্পন্ন"],
};
const approvalStatus: Record<string, [string, string]> = {
  requested: ["Waiting for you", "আপনার অনুমোদনের অপেক্ষায়"],
  approved: ["Approved", "অনুমোদিত"],
  changes_requested: ["Changes requested", "পরিবর্তন চাওয়া হয়েছে"],
};
const invoiceStatus: Record<string, [string, string]> = {
  draft: ["Draft", "খসড়া"],
  issued: ["Awaiting payment", "পেমেন্টের অপেক্ষায়"],
  payment_submitted: ["Payment being checked", "পেমেন্ট যাচাই চলছে"],
  paid: ["Paid", "পরিশোধিত"],
  void: ["Cancelled", "বাতিল"],
};
const projectType: Record<string, [string, string]> = {
  website: ["Website", "ওয়েবসাইট"],
  ecommerce: ["Online store", "অনলাইন স্টোর"],
  "mobile-app": ["Mobile app", "মোবাইল অ্যাপ"],
  software: ["Business software", "বিজনেস সফটওয়্যার"],
  strategy: ["Strategy & support", "পরিকল্পনা ও সাপোর্ট"],
  other: ["Other", "অন্যান্য"],
};
const budget: Record<string, [string, string]> = {
  discuss: ["Let’s discuss", "আলোচনা করতে চাই"],
  starter: ["Starter project", "ছোট প্রজেক্ট"],
  growing: ["Growing business", "বড় হচ্ছে এমন ব্যবসা"],
  custom: ["Custom platform", "কাস্টম প্ল্যাটফর্ম"],
};
const timeline: Record<string, [string, string]> = {
  exploring: ["Exploring options", "ভেবে দেখছি"],
  "this-month": ["This month", "এই মাসে"],
  "next-quarter": ["Next quarter", "আগামী তিন মাসে"],
  later: ["Later", "পরে"],
};

const pick =
  (map: Record<string, [string, string]>) => (value: string | null | undefined, bn: boolean) =>
    value ? (map[value]?.[bn ? 1 : 0] ?? value) : "";

export const projectStatusLabel = pick(projectStatus);
export const milestoneStatusLabel = pick(milestoneStatus);
export const approvalStatusLabel = pick(approvalStatus);
export const invoiceStatusLabel = pick(invoiceStatus);
export const projectTypeLabel = pick(projectType);
export const budgetLabel = pick(budget);
export const timelineLabel = pick(timeline);
