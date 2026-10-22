// The one OANRO sign-off used everywhere on the website (handwritten "Team oanro" with a pen stroke). Styles: .v2-sign in app/v2.css.
export function Signature({ className = "" }: { className?: string }) {
  return <p className={`v2-sign ${className}`.trim()}><span>Team oanro</span></p>;
}
