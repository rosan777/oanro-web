"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw, Pause, Play } from "lucide-react";
import { useMotion } from "./experience";

export default function Scene({ mode = "headphones" }: { mode?: "headphones" | "universe" }) {
  const host = useRef<HTMLDivElement>(null);
  const rotate = useRef<(delta: number) => void>(() => {});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [spin, setSpin] = useState(true);
  const spinning = useRef(false);
  const { allowed } = useMotion();
  useEffect(() => { spinning.current = allowed && spin; }, [allowed, spin]);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    const node = host.current;
    if (!node) return;
    import("three").then(THREE => {
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); }
      catch { setFailed(true); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x151515, mode === "headphones" ? 1 : 0);
      renderer.domElement.setAttribute("aria-hidden", "true");
      node.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
      camera.position.set(0, 0.2, mode === "headphones" ? 6.6 : 5);
      const group = new THREE.Group(); scene.add(group);
      scene.add(new THREE.AmbientLight(0xffffff, 2.5));
      const key = new THREE.DirectionalLight(0xffffff, 5); key.position.set(3, 4, 5); scene.add(key);
      const rim = new THREE.PointLight(0xc49a4a, 45); rim.position.set(-3, 2, 3); scene.add(rim);
      const green = new THREE.PointLight(0x50856a, 30); green.position.set(3, -2, 2); scene.add(green);
      if (mode === "universe") {
        const points = new Float32Array(480 * 3);
        for (let i = 0; i < 480; i++) { const t = i * 2.399963; const r = 0.6 + (i % 71) / 25; points[i * 3] = Math.cos(t) * r; points[i * 3 + 1] = Math.sin(t) * r; points[i * 3 + 2] = ((i * 13) % 100) / 40 - 1.25; }
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
        group.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xc49a4a, size: 0.014, transparent: true, opacity: 0.65 })));
      } else {
        const shell = new THREE.MeshStandardMaterial({ color: 0x282b29, metalness: 0.4, roughness: 0.35 });
        const cushion = new THREE.MeshStandardMaterial({ color: 0x131614, roughness: 0.9 });
        const metal = new THREE.MeshStandardMaterial({ color: 0xc49a4a, metalness: 0.8, roughness: 0.3 });
        const band = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.12, 18, 70, Math.PI), shell); band.position.y = 0.25; group.add(band);
        for (const side of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.65, 20), metal); arm.position.set(side * 1.1, -0.03, 0); group.add(arm);
          const cup = new THREE.Mesh(new THREE.SphereGeometry(0.48, 36, 24), shell); cup.scale.set(0.65, 1.27, 0.58); cup.position.set(side * 1.04, -0.55, 0); group.add(cup);
          const pad = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.09, 16, 40), cushion); pad.scale.set(0.8, 1.43, 1); pad.position.set(side * 1.04, -0.55, 0.23); group.add(pad);
        }
        group.rotation.set(0.05, -0.35, -0.08);
      }
      let dirty = true; let visible = true; let previous = 0; let lastDraw = 0; let frame = 0;
      const resize = new ResizeObserver(() => { const width = node.clientWidth; const height = Math.max(1, node.clientHeight); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); dirty = true; }); resize.observe(node);
      const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; dirty = true; }); visibility.observe(node);
      rotate.current = delta => { group.rotation.y += delta; dirty = true; };
      let dragging = false; let lastX = 0;
      const down = (event: PointerEvent) => { if (mode !== "headphones") return; dragging = true; lastX = event.clientX; renderer.domElement.setPointerCapture(event.pointerId); setSpin(false); };
      const move = (event: PointerEvent) => { if (!dragging) return; rotate.current((event.clientX - lastX) * 0.012); lastX = event.clientX; };
      const up = () => { dragging = false; };
      renderer.domElement.addEventListener("pointerdown", down); renderer.domElement.addEventListener("pointermove", move); renderer.domElement.addEventListener("pointerup", up); renderer.domElement.addEventListener("pointercancel", up);
      const draw = (time: number) => {
        frame = requestAnimationFrame(draw);
        const delta = Math.min((time - previous) / 1000 || 0, 0.05); previous = time;
        if (!visible || document.hidden || time - lastDraw < 32) return;
        if (spinning.current) { group.rotation.y += delta * (mode === "universe" ? 0.12 : 0.4); if (mode === "universe") group.rotation.z += delta * 0.04; dirty = true; }
        if (dirty) { renderer.render(scene, camera); lastDraw = time; dirty = false; }
      };
      frame = requestAnimationFrame(draw); setReady(true);
      cleanup = () => {
        cancelAnimationFrame(frame); resize.disconnect(); visibility.disconnect(); rotate.current = () => {};
        renderer.domElement.removeEventListener("pointerdown", down); renderer.domElement.removeEventListener("pointermove", move); renderer.domElement.removeEventListener("pointerup", up); renderer.domElement.removeEventListener("pointercancel", up);
        scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Points) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => material.dispose()); } });
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; cleanup(); };
  }, [mode]);
  return <div className={`scene-wrapper ${mode}`}>
    <div ref={host} className="scene-canvas" aria-label={mode === "headphones" ? "Interactive 3D headphone concept" : undefined} role={mode === "headphones" ? "img" : undefined} aria-hidden={mode === "universe" ? true : undefined} />
    {mode === "headphones" && <>{(!ready || failed) && <div className="scene-fallback"><div className="headphone-fallback" /><p>{failed ? "3D is unavailable on this device. The product photo remains available." : "Loading 3D concept..."}</p></div>}
      <div className="scene-controls"><button className="icon-button" type="button" title="Rotate left" aria-label="Rotate model left" onClick={() => { setSpin(false); rotate.current(-0.35); }}><RotateCcw size={18} /></button><button className="icon-button" type="button" disabled={!allowed} title={spin ? "Pause rotation" : "Rotate automatically"} aria-label={spin ? "Pause model rotation" : "Start model rotation"} onClick={() => setSpin(!spin)}>{spin && allowed ? <Pause size={18} /> : <Play size={18} />}</button><button className="icon-button" type="button" title="Rotate right" aria-label="Rotate model right" onClick={() => { setSpin(false); rotate.current(0.35); }}><RotateCw size={18} /></button></div><p className="scene-caption">Drag to rotate / illustrative 3D concept</p></>}
  </div>;
}
