const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

// Pure scroll mapping: revisiting any progress gives exactly the same pose.
export function valuePose(progress: number, index: number, step: number) {
  const gather = ease(progress / 0.36);
  const spread = ease((progress - 0.36) / 0.64);
  const spacing = step * 0.62 * (1 - gather) + 14 * gather * (1 - spread) + step * spread;
  return {
    x: (index - 1.5) * spacing,
    y: (1 - gather) * 28 - index * 3 * gather * (1 - spread),
    angle: (index - 1.5) * (1 - gather) * 4 + (index - 1.5) * spread * 2,
    opacity: index === 0 ? 1 : Math.max(0.35 * (1 - gather), spread),
    blur: 2.4 * (1 - gather),
  };
}
