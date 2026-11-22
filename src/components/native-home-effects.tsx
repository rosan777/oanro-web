"use client";

import { useEffect } from "react";

export function NativeHomeEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".selected-home");
    if (!root) return;
    const controller = new AbortController();
    const { signal } = controller;
    const display = document.documentElement;
    const theme = root.querySelector<HTMLSelectElement>("#theme");
    const applyTheme = () => {
      if (!theme) return;
      const mode = display.dataset.appearance || "system";
      theme.value = mode[0].toUpperCase() + mode.slice(1);
      theme.dispatchEvent(new Event("change"));
    };
    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(display, { attributes: true, attributeFilter: ["data-appearance"] });
    window.addEventListener("oanro-show-home-store", () => {
      const replay = root.querySelector<HTMLButtonElement>("#store-pop");
      replay?.focus({ preventScroll: true });
      replay?.scrollIntoView({
        block: "center",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
      replay?.click();
    }, { signal });

    const modules = ["instrument/study", "studio-field", "home-final", "store-flow", "line-lift"];
    void Promise.all(modules.map(name =>
      import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `/selected-home/home-assets/${name}-native.js`)
    )).then(loaded => {
      if (!signal.aborted) loaded.forEach(module => module.mount(root, signal));
    }).catch(error => console.error("OANRO homepage interactions failed to start", error));
    return () => {
      controller.abort();
      observer.disconnect();
    };
  }, []);
  return null;
}
