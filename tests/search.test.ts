import test from "node:test";
import assert from "node:assert/strict";
import { intents, rank, related } from "../src/lib/smart-search";

const items = [{ n: "Wool Beanie", c: "Caps" }, { n: "Pearl Drop Necklace", c: "Jewelry" }, { n: "Studio Headphones", c: "Tech" }];
const f = (x: typeof items[number]) => [{ text: x.n, weight: 3 }, { text: x.c, weight: 2 }];

test("search: direct matches, typos, and same-kind suggestions when nothing matches", () => {
  assert.deepEqual(rank("neklace", items, f).map(x => x.n), ["Pearl Drop Necklace"], "small typo still finds it");
  assert.equal(rank("scarf", items, f).length, 0, "no direct match for scarf");
  assert.deepEqual(intents("warm scarf"), ["wear"]);
  assert.deepEqual(related("scarf", items, f).map(x => x.n), ["Wool Beanie"], "suggests clothing for a clothing search");
  assert.deepEqual(related("gold ring", items, f).map(x => x.n), ["Pearl Drop Necklace"]);
  assert.deepEqual(related("qwerty zzz", items, f), [], "unclear words suggest nothing");
});
