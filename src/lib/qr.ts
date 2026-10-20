// Minimal QR code encoder (byte mode, error correction M, versions 1–10, up to 213 bytes).
// Follows ISO/IEC 18004; structure after Project Nayuki's public QR generator. Used for the
// two-step verification setup link, so nothing is sent to a third-party QR service.
const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const rawModules = (v: number) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
const dataCodewords = (v: number) => Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[v] * BLOCKS[v];
function gfMul(x: number, y: number) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z; }
function rsDivisor(degree: number) {
  const r = new Array<number>(degree).fill(0); r[degree - 1] = 1; let root = 1;
  for (let i = 0; i < degree; i++) { for (let j = 0; j < degree; j++) { r[j] = gfMul(r[j], root); if (j + 1 < degree) r[j] ^= r[j + 1]; } root = gfMul(root, 2); }
  return r;
}
function rsRemainder(data: number[], div: number[]) {
  const r = new Array<number>(div.length).fill(0);
  for (const b of data) { const f = b ^ (r.shift() as number); r.push(0); div.forEach((c, i) => { r[i] ^= gfMul(c, f); }); }
  return r;
}
/** Returns the QR matrix (true = dark) for the text, or null if it is too long. */
export function qrMatrix(text: string): boolean[][] | null {
  const bytes = [...new TextEncoder().encode(text)];
  let v = 1;
  for (; v <= 10; v++) if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= dataCodewords(v) * 8) break;
  if (v > 10) return null;
  // Data bits: byte mode, length, bytes, terminator, padding.
  const bits: number[] = []; const put = (val: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  const cap = dataCodewords(v) * 8; put(0, Math.min(4, cap - bits.length)); put(0, (8 - bits.length % 8) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data: number[] = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  // Split into blocks, add Reed–Solomon error correction, interleave.
  const nb = BLOCKS[v], eccLen = ECC_PER_BLOCK[v], raw = Math.floor(rawModules(v) / 8), short = nb - raw % nb, shortLen = Math.floor(raw / nb), div = rsDivisor(eccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < nb; i++) { const d = data.slice(k, k + shortLen - eccLen + (i < short ? 0 : 1)); k += d.length; const e = rsRemainder(d, div); if (i < short) d.push(0); blocks.push(d.concat(e)); }
  const words: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= short) words.push(b[i]); });
  // Function patterns.
  const size = v * 4 + 17;
  const m = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => { m[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
  }
  if (v >= 2) {
    const n = Math.floor(v / 7) + 2, step = Math.floor((v * 8 + n * 3 + 5) / (n * 4 - 4)) * 2, pos = [6];
    for (let p = size - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
    pos.forEach((x, i) => pos.forEach((y, j) => { if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
  }
  const format = (mask: number) => {
    const d = (0 << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412, bit = (i: number) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  format(0);
  if (v >= 7) {
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const bit = ((b >>> i) & 1) === 1, a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, bit); set(c, a, bit); }
  }
  // Data in the zigzag order.
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!fn[y][x] && i < words.length * 8) { m[y][x] = ((words[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
    }
  }
  // Pick the mask with the lowest (simplified) penalty: long runs and dark/light imbalance.
  const flip = (mask: number) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const inv = [(x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0, (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x * y) % 2 + (x * y) % 3 === 0, ((x * y) % 2 + (x * y) % 3) % 2 === 0, ((x + y) % 2 + (x * y) % 3) % 2 === 0][mask];
    if (!fn[y][x] && inv) m[y][x] = !m[y][x]; } };
  const penalty = () => {
    let p = 0, dark = 0;
    for (let a = 0; a < size; a++) for (const horiz of [true, false]) { let run = 1;
      for (let b = 1; b <= size; b++) { const cur = b < size && (horiz ? m[a][b] === m[a][b - 1] : m[b][a] === m[b - 1][a]); if (cur) run++; else { if (run >= 5) p += run - 2; run = 1; } } }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
    m.forEach(row => row.forEach(c => { if (c) dark++; }));
    return p + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  };
  let best = 0, bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) { flip(mask); format(mask); const s = penalty(); if (s < bestScore) { best = mask; bestScore = s; } flip(mask); }
  flip(best); format(best);
  return m;
}
/** SVG path data (one unit per module, 4-module quiet zone) for an <svg viewBox>. */
export function qrSvg(text: string) {
  const m = qrMatrix(text); if (!m) return null;
  const q = 4, size = m.length + q * 2; let d = "";
  m.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x + q} ${y + q}h1v1h-1z`; }));
  return { size, path: d };
}
