import { parseBlocks, type Piece } from "@/lib/assistant/sanitize";
import Link from "./locale-link";

const render = (pieces: Piece[]) => pieces.map((p, i) => p.type === "bold" ? <strong key={i}>{p.text}</strong> : p.type === "link" ? <Link key={i} href={p.href}>{p.text}</Link> : <span key={i}>{p.text}</span>);
/** Assistant text as React elements: bold, lists and links to internal pages only. Never innerHTML, so model output cannot inject markup. */
export function RichText({ text }: { text: string }) {
  return <>{parseBlocks(text).map((b, i) => b.type === "ul" ? <ul key={i}>{b.items.map((item, j) => <li key={j}>{render(item)}</li>)}</ul> : <p key={i}>{render(b.pieces)}</p>)}</>;
}
