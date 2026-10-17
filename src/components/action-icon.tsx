// OANRO's own small line icons for action buttons (24×24 grid, 1.8 stroke, inherits text colour).
// Always used next to a text label, never on their own.
const paths = {
  approve: "M4 12.5l5 5L20 6.5",
  reject: "M6 6l12 12M18 6L6 18",
  courier: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  route: "M5 19a2 2 0 100-4 2 2 0 000 4zM19 9a2 2 0 100-4 2 2 0 000 4zM7 17h6a3 3 0 000-6H11a3 3 0 010-6h6",
  delivered: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9M9 15.5l2 2 4-4",
  returned: "M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-2",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  archive: "M4 5h16v4H4zM5 9v10h14V9M10 13h4",
  copy: "M9 9h10v11H9zM5 15V4h10",
  remove: "M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  save: "M5 12.5l4.5 4.5L19 7.5",
  cancel: "M7 7l10 10M17 7L7 17",
  download: "M12 4v11M7 10l5 5 5-5M5 19h14",
  workspace: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  signout: "M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 16l-4-4 4-4M6 12h10",
  chart: "M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3",
  "trend-up": "M4 16l5-5 4 4 7-7M15 8h5v5",
  "trend-down": "M4 8l5 5 4-4 7 7M15 16h5v-5",
  alert: "M12 4l9 16H3L12 4zM12 10v4M12 17.5v.5",
  box: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9",
  coin: "M12 21a9 9 0 100-18 9 9 0 000 18zM9 9h4.5a2 2 0 010 4H10M10 8v8M9 16h5",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h3",
  wallet: "M4 7h15a1 1 0 011 1v10a1 1 0 01-1 1H4zM4 7l11-3v3M16 13h1",
  inquiry: "M4 5h16v11H9l-5 4V5zM8 9h8M8 12h5",
} as const;
export type ActionIconName = keyof typeof paths;
export function ActionIcon({ name, size = 16 }: { name: ActionIconName; size?: number }) {
  return <svg className="action-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}
