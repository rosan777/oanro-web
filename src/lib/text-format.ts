// Small text helpers safe for both server and browser code (no database or cache imports).
export const bnDigits = (s: string) => s.replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)]);
export const dayText = (range: string) => range.replace("-", "–");
