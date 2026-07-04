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
  dense: "1rem",
  normal: "1.25rem",
  spacious: "1.75rem",
};

const toneMap: Record<
  DashboardPanelTone,
  {
    borderColor: string;
    glow: string;
    ring: string;
  }
> = {
  default: {
    borderColor: "var(--border-strong)",
    glow: "rgba(59, 130, 246, 0.12)",
    ring: "rgba(255, 255, 255, 0.04)",
  },
  accent: {
    borderColor: "rgba(168, 85, 247, 0.34)",
    glow: "rgba(168, 85, 247, 0.18)",
    ring: "rgba(168, 85, 247, 0.06)",
  },
  blue: {
    borderColor: "rgba(96, 165, 250, 0.32)",
    glow: "rgba(59, 130, 246, 0.16)",
    ring: "rgba(59, 130, 246, 0.08)",
  },
  success: {
    borderColor: "rgba(45, 212, 191, 0.32)",
    glow: "rgba(45, 212, 191, 0.16)",
    ring: "rgba(45, 212, 191, 0.08)",
  },
  warning: {
    borderColor: "rgba(234, 179, 8, 0.28)",
    glow: "rgba(234, 179, 8, 0.14)",
    ring: "rgba(234, 179, 8, 0.08)",
  },
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
  const resolvedTone = toneMap[tone];

  return (
    <Component
      className={clsx("dashboard-panel", className)}
      style={{
        position: "relative",
        overflow: "hidden",
        padding: paddingMap[padding],
        borderRadius: "1.5rem",
        border: `1px solid ${resolvedTone.borderColor}`,
        background:
          "linear-gradient(180deg, rgba(16, 24, 48, 0.96) 0%, rgba(7, 12, 28, 0.96) 100%)",
        boxShadow:
          "0 24px 60px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 auto auto 0",
          width: "14rem",
          height: "14rem",
          borderRadius: "999px",
          background: `radial-gradient(circle, ${resolvedTone.glow} 0%, transparent 72%)`,
          transform: "translate(-24%, -30%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: "1px",
          background: resolvedTone.ring,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </Component>
  );
}
