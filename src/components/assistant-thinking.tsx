import { Rocket } from "lucide-react";

/**
 * "Juno is thinking": the approved loading state (owner's juno-password-demo design). A rounded-square rocket badge,
 * "OANRO AI" over "Juno is thinking" with three blinking dots, and a short sliding line underneath.
 * Shown only while a reply is being generated. All motion is CSS (assistant.css) and stops for reduced motion
 * and the site's Pause motion switch. The whole indicator scales with one variable (--tk) so it can be fitted to the chat.
 */
export function JunoThinking({ bn }: { bn: boolean }) {
  const status = bn ? "JUNO ভাবছে" : "Juno is thinking";
  return <div className="asst-think" role="status" aria-label={`OANRO AI: ${status}`}>
    <span className="asst-think-badge" aria-hidden="true"><Rocket className="asst-think-rocket" strokeWidth={1.55} /></span>
    <span className="asst-think-copy" aria-hidden="true">
      <span className="asst-think-brand">OANRO AI</span>
      <span className="asst-think-status">{status}<span className="asst-think-dots"><b /><b /><b /></span></span>
      <span className="asst-think-track" />
    </span>
  </div>;
}
