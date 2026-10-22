import test from "node:test";
import assert from "node:assert/strict";
import { discountAmount, parseDiscountCode } from "../src/lib/order-input";
import { checkCode, type DiscountRow } from "../src/lib/discount-store";

test("discount codes: format, amount and rules", () => {
  assert.equal(parseDiscountCode(" winter10 "), "WINTER10");
  assert.equal(parseDiscountCode(""), "");
  assert.throws(() => parseDiscountCode("x"));
  assert.throws(() => parseDiscountCode("bad code!"));
  assert.equal(discountAmount("percent", 10, 1490), 149);
  assert.equal(discountAmount("amount", 200, 150), 150, "never more than the subtotal");
  const base: DiscountRow = { code: "WINTER10", kind: "percent", value: 10, minSubtotal: 1000, maxUses: 2, used: 0, startsAt: null, endsAt: null, active: true, note: "", createdBy: null, createdAt: new Date(), collections: [], products: [] };
  assert.deepEqual(checkCode(base, 2000), { amount: 200 });
  assert.equal("error" in checkCode(base, 500) && checkCode(base, 500).error, "MIN_SUBTOTAL");
  assert.equal("error" in checkCode({ ...base, used: 2 }, 2000) && checkCode({ ...base, used: 2 }, 2000).error, "USED_UP");
  assert.equal("error" in checkCode({ ...base, active: false }, 2000) && checkCode({ ...base, active: false }, 2000).error, "INVALID");
  assert.equal("error" in checkCode({ ...base, endsAt: new Date(Date.now() - 1000) }, 2000) && checkCode({ ...base, endsAt: new Date(Date.now() - 1000) }, 2000).error, "EXPIRED");
  // Scoped code: only caps (section) and one named product count.
  const caps: DiscountRow = { ...base, minSubtotal: 0, collections: ["caps"], products: ["silver-ring"] };
  const bag = [{ slug: "river-cap", collectionId: "caps", total: 1000 }, { slug: "wool-hoodie", collectionId: "seasonal", total: 3000 }, { slug: "silver-ring", collectionId: "jewelry", total: 500 }];
  assert.deepEqual(checkCode(caps, bag), { amount: 150 }, "10% of the cap and the ring only, not the hoodie");
  assert.equal("error" in checkCode(caps, [bag[1]]) && checkCode(caps, [bag[1]]).error, "NOT_ELIGIBLE");
  assert.deepEqual(checkCode(base, bag), { amount: 450 }, "an everything-code covers the whole bag");
  assert.equal("error" in checkCode({ ...caps, minSubtotal: 2000 }, bag) && checkCode({ ...caps, minSubtotal: 2000 }, bag).error, "MIN_SUBTOTAL", "minimum counts eligible items only");
  assert.equal("error" in checkCode(undefined, 2000) && checkCode(undefined, 2000).error, "INVALID");
});
