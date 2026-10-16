"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { Globe2, ShieldCheck, MessageCircle, PackageCheck } from "lucide-react";
import { useMotion } from "./experience";
import { valuePose } from "./value-motion";
import styles from "./value-fan.module.css";
import { useT } from "./locale";
const values = [
  { title: "Bangladesh first", bn: "বাংলাদেশ প্রথম", icon: Globe2 },
  { title: "Clear information", bn: "স্পষ্ট তথ্য", icon: ShieldCheck },
  { title: "Thoughtful support", bn: "যত্নশীল সহায়তা", icon: MessageCircle },
  { title: "Room to grow", bn: "বড় হওয়ার সুযোগ", icon: PackageCheck },
];
export function ValueFan(props: { showProducts?: boolean }) {
  void props;
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const { allowed } = useMotion(); const t = useT();
  useEffect(() => {
    const node = root.current; const scene = stage.current;
    if (!node || !scene) return;
    const cards = Array.from(node.querySelectorAll<HTMLElement>("[data-value-card]"));
    const reset = () => { delete node.dataset.animated; cards.forEach(card => { card.style.removeProperty("transform"); card.style.removeProperty("--card-angle"); card.style.removeProperty("--label-opacity"); card.style.removeProperty("--card-blur"); }); };
    if (!allowed) { reset(); return; }
    node.dataset.animated = "true";
    let frame = 0;
    const update = () => {
      const top = parseFloat(getComputedStyle(scene).top) || 0;
      const runway = Math.max(1, node.offsetHeight - scene.offsetHeight);
      const lead = Math.min(110, innerHeight * 0.14);
      const progress = (top + lead - node.getBoundingClientRect().top) / (runway + lead);
      const step = Math.min(180, node.clientWidth * 0.235);
      cards.forEach((card, index) => {
        const pose = valuePose(progress, index, step);
        card.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0)`;
        card.style.setProperty("--card-angle", `${pose.angle}deg`);
        card.style.setProperty("--label-opacity", String(pose.opacity));
        card.style.setProperty("--card-blur", `${pose.blur}px`);
      });
      frame = 0;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    const resize = new ResizeObserver(schedule); resize.observe(node); resize.observe(scene);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule); window.addEventListener("pageshow", schedule);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); window.removeEventListener("pageshow", schedule); reset(); };
  }, [allowed]);
  return <section ref={root} className={styles.section} aria-label={t("The OANRO values", "OANRO-র মূল্যবোধ")} data-motion-enabled={allowed}>
    <div ref={stage} className={styles.stage}>
      <div className={styles.fan} role="list">
        {values.map((value, index) => <article data-value-card className={styles.item} role="listitem" key={value.title} style={{ "--slot": index - 1.5, "--depth": index } as CSSProperties}>
          <div className={styles.tilt}><div className={styles.glass}>
            <value.icon className={styles.icon} aria-hidden="true" strokeWidth={1.25} />
          </div></div><h3>{t(value.title, value.bn)}</h3>
        </article>)}
      </div>
    </div>
  </section>;
}
