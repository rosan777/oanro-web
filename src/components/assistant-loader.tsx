"use client";
import dynamic from "next/dynamic";
import type { PublicAssistantConfig } from "@/lib/assistant/types";

// Loaded only when the assistant is switched on: with it off, no assistant code or CSS reaches visitors at all.
const Launcher = dynamic(() => import("./assistant-launcher").then(m => m.AssistantLauncher), { ssr: false });
export function AssistantLoader({ config }: { config: PublicAssistantConfig }) { return <Launcher config={config} />; }
