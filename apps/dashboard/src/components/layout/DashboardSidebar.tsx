"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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
    <aside className="sidebar">
      <div className="sidebar__brand">
        <p className="eyebrow" style={{ margin: 0 }}>
          Fleet Intel
        </p>
        <h1 className="sidebar__wordmark">Moonrakers</h1>
      </div>

      <nav aria-label="Primary" className="sidebar__nav">
        {navSections.map((section) => (
          <div className="sidebar__group" key={section.title}>
            <p className="sidebar__group-label">{section.title}</p>
            <ul className="sidebar__list">
              {section.items.map(([href, label]) => {
                const active = isNavItemActive(href, pathname);
                const routeHref = focusPlayerId
                  ? `${href}?focusPlayerId=${encodeURIComponent(focusPlayerId)}`
                  : href;

                return (
                  <li key={href}>
                    <Link
                      aria-current={active ? "page" : undefined}
                      className="sidebar__link"
                      href={routeHref}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <p className="sidebar__foot" style={{ margin: 0 }}>
        Moonrakers board game companion
      </p>
    </aside>
  );
}
