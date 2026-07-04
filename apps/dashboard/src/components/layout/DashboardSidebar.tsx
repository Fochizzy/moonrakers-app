"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DashboardPanel } from "@/components/ui/DashboardPanel";

const navItems = [
  ["/", "Home"],
  ["/compare", "Compare"],
  ["/stats", "Stats"],
  ["/charts", "Charts"],
  ["/insights", "Insights"],
  ["/elo", "ELO"],
  ["/profile", "Profile"],
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <DashboardPanel
      as="aside"
      padding="spacious"
      tone="blue"
      style={{ display: "grid", gap: "1.5rem", minHeight: "100%" }}
    >
      <div style={{ display: "grid", gap: "0.8rem" }}>
        <p className="section-eyebrow" style={{ margin: 0 }}>
          Fleet Intel
        </p>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <h1
            style={{
              margin: 0,
              color: "var(--text-strong)",
              fontSize: "1.8rem",
              letterSpacing: "-0.05em",
            }}
          >
            Moonrakers
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--sub)",
              fontSize: "0.98rem",
              lineHeight: 1.65,
            }}
          >
            Board-game command deck for your crew, rival matchups, chart reads,
            and table correlations.
          </p>
        </div>
      </div>

      <nav aria-label="Primary">
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gap: "0.7rem",
          }}
        >
          {navItems.map(([href, label]) => {
            const active =
              href === "/"
                ? pathname === "/"
                : Boolean(pathname?.startsWith(href));

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.85rem",
                    padding: "0.95rem 1rem",
                    borderRadius: "1rem",
                    border: `1px solid ${
                      active ? "rgba(168, 85, 247, 0.4)" : "var(--border)"
                    }`,
                    background: active
                      ? "linear-gradient(135deg, rgba(168, 85, 247, 0.16) 0%, rgba(59, 130, 246, 0.12) 100%)"
                      : "rgba(255, 255, 255, 0.03)",
                    color: active ? "var(--text-strong)" : "var(--text)",
                    fontWeight: active ? 700 : 600,
                  }}
                >
                  <span>{label}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      width: "0.5rem",
                      height: "0.5rem",
                      borderRadius: "999px",
                      background: active ? "var(--gold)" : "var(--grid)",
                      boxShadow: active ? "0 0 14px rgba(45, 212, 191, 0.6)" : "none",
                    }}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        style={{
          marginTop: "auto",
          display: "grid",
          gap: "0.55rem",
          paddingTop: "0.2rem",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--text-strong)",
            fontSize: "0.92rem",
            fontWeight: 700,
          }}
        >
          Moonrakers board game companion
        </p>
        <p
          style={{
            margin: 0,
            color: "var(--muted)",
            fontSize: "0.88rem",
            lineHeight: 1.6,
          }}
        >
          The same dark command-table language as the app, translated into a
          signed-in desktop dashboard.
        </p>
      </div>
    </DashboardPanel>
  );
}
