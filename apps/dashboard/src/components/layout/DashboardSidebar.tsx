"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { DashboardPanel } from "@/components/ui/DashboardPanel";

const navSections = [
  {
    title: "Command",
    items: [
      ["/", "Home"],
      ["/analytics", "Data"],
      ["/history", "History"],
    ],
  },
  {
    title: "Analytics",
    items: [
      ["/compare", "Compare"],
      ["/stats", "Stats"],
      ["/charts", "Charts"],
      ["/insights", "Insights"],
      ["/elo", "ELO"],
    ],
  },
  {
    title: "Players",
    items: [
      ["/players", "Roster"],
      ["/player-profile", "Profiles"],
      ["/player-cards", "Player Cards"],
      ["/profile", "Your Profile"],
    ],
  },
  {
    title: "Reference",
    items: [["/definitions", "Definitions"]],
  },
] as const;

/** `/` prefixes every route, so it only counts as active on an exact match. */
function isNavItemActive(href: string, pathname: string | null) {
  if (!pathname) {
    return false;
  }

  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusPlayerId = searchParams?.get("focusPlayerId")?.trim() || null;

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

      <nav aria-label="Primary" style={{ display: "grid", gap: "1.1rem" }}>
        {navSections.map((section) => (
          <div key={section.title} style={{ display: "grid", gap: "0.5rem" }}>
            <p
              style={{
                margin: 0,
                color: "var(--muted)",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {section.title}
            </p>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gap: "0.45rem",
              }}
            >
              {section.items.map(([href, label]) => {
                const active = isNavItemActive(href, pathname);
                const routeParams = new URLSearchParams();

                if (focusPlayerId) {
                  routeParams.set("focusPlayerId", focusPlayerId);
                }

                const routeHref =
                  routeParams.size > 0
                    ? `${href}?${routeParams.toString()}`
                    : href;

                return (
                  <li key={href}>
                    <Link
                      href={routeHref}
                      aria-current={active ? "page" : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.85rem",
                        padding: "0.7rem 0.95rem",
                        borderRadius: "0.9rem",
                        border: `1px solid ${
                          active ? "rgba(168, 85, 247, 0.4)" : "var(--border)"
                        }`,
                        background: active
                          ? "linear-gradient(135deg, rgba(168, 85, 247, 0.16) 0%, rgba(59, 130, 246, 0.12) 100%)"
                          : "rgba(255, 255, 255, 0.03)",
                        color: active ? "var(--text-strong)" : "var(--text)",
                        fontSize: "0.95rem",
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
                          boxShadow: active
                            ? "0 0 14px rgba(45, 212, 191, 0.6)"
                            : "none",
                        }}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
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
