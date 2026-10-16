import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export function AdminBack() { return <Link className="back-link" href="/admin"><ArrowLeft size={16} />All sections</Link>; }
