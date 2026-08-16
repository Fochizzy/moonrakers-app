import { clsx } from "clsx";

type DashboardPanelTone = "default" | "accent" | "blue" | "success" | "warning";
type DashboardPanelElement = "article" | "aside" | "div" | "header" | "section";
type DashboardPanelPadding = "dense" | "normal" | "spacious";

type DashboardPanelProps = {
  as?: DashboardPanelElement;
  children: React.ReactNode;
  className?: string;
  padding?: DashboardPanelPadding;
  style?: React.CSSProperties;
  tone?: DashboardPanelTone;
};

const paddingMap: Record<DashboardPanelPadding, string> = {
  dense: "0.85rem",
  normal: "1.1rem",
  spacious: "1.25rem",
};

const toneClass: Record<DashboardPanelTone, string | null> = {
  default: null,
  accent: "panel--accent",
  blue: "panel--blue",
  success: "panel--success",
  warning: "panel--warning",
};

export function DashboardPanel({
  as = "section",
  children,
  className,
  padding = "normal",
  style,
  tone = "default",
}: DashboardPanelProps) {
  const Component = as;

  return (
    <Component
      className={clsx("panel", toneClass[tone], className)}
      style={{ padding: paddingMap[padding], ...style }}
    >
      {children}
    </Component>
  );
}
