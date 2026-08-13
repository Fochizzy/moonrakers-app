 "use client";

import { startTransition, useDeferredValue, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DashboardPanel } from "@/components/ui/DashboardPanel";

export type DashboardPlayerOption = {
  id: string;
  label: string;
};

type DashboardTopbarProps = {
  favoriteColor: string | null;
  playerOptions: DashboardPlayerOption[];
  profileName: string;
  signedInPlayerId: string;
};

export function DashboardTopbar({
  favoriteColor,
  playerOptions,
  profileName,
  signedInPlayerId,
}: DashboardTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [playerSearch, setPlayerSearch] = useState("");
  const deferredPlayerSearch = useDeferredValue(playerSearch);
  const profileAccent = favoriteColor?.trim() || "var(--gold)";
  const requestedFocusPlayerId =
    searchParams?.get("focusPlayerId")?.trim() || signedInPlayerId;
  const selectedOption =
    playerOptions.find((option) => option.id === requestedFocusPlayerId) ??
    playerOptions.find((option) => option.id === signedInPlayerId) ??
    playerOptions[0] ??
    null;
  const normalizedSearch = deferredPlayerSearch.trim().toLowerCase();
  let filteredOptions =
    normalizedSearch.length === 0
      ? playerOptions
      : playerOptions.filter((option) =>
          option.label.toLowerCase().includes(normalizedSearch),
        );

  if (
    selectedOption &&
    !filteredOptions.some((option) => option.id === selectedOption.id)
  ) {
    filteredOptions = [selectedOption, ...filteredOptions];
  }

  function updateFocusPlayer(nextFocusPlayerId: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (nextFocusPlayerId) {
      params.set("focusPlayerId", nextFocusPlayerId);
    } else {
      params.delete("focusPlayerId");
    }

    if (params.get("comparePlayerId") === nextFocusPlayerId) {
      params.delete("comparePlayerId");
    }

    if (params.get("opponentId") === nextFocusPlayerId) {
      params.delete("opponentId");
    }

    const nextHref = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.push(nextHref);
    });
  }

  return (
    <DashboardPanel
      as="header"
      padding="normal"
      tone="accent"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "grid", gap: "0.45rem", minWidth: 0 }}>
        <p className="section-eyebrow" style={{ margin: 0 }}>
          Captain&apos;s Log
        </p>
        <div style={{ display: "grid", gap: "0.25rem" }}>
          <h2
            style={{
              margin: 0,
              color: "var(--text-strong)",
              fontSize: "1.2rem",
              letterSpacing: "-0.03em",
            }}
          >
            Signed-in personal dashboard
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--sub)",
              fontSize: "0.96rem",
              lineHeight: 1.6,
            }}
          >
            Compare crews, scan correlations, and track your published Moonrakers
            trends from one command rail.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "0.85rem",
          width: "min(100%, 22rem)",
          justifyItems: "end",
          flex: "0 0 auto",
          marginLeft: "auto",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 0.95rem",
            borderRadius: "999px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "rgba(255, 255, 255, 0.04)",
            justifySelf: "end",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "0.85rem",
              height: "0.85rem",
              borderRadius: "999px",
              background: profileAccent,
              boxShadow: `0 0 18px ${profileAccent}`,
              flexShrink: 0,
            }}
          />
          <div style={{ display: "grid", gap: "0.1rem" }}>
            <span
              style={{
                color: "var(--muted)",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Active Pilot
            </span>
            <span
              style={{
                color: "var(--text-strong)",
                fontSize: "0.98rem",
                fontWeight: 700,
              }}
            >
              {profileName}
            </span>
          </div>
        </div>

        {playerOptions.length > 0 ? (
          <div
            style={{
              display: "grid",
              gap: "0.55rem",
              width: "100%",
            }}
          >
            <span
              style={{
                color: "var(--gold)",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                textAlign: "right",
              }}
            >
              Player Focus
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(11rem, 1.1fr)",
                gap: "0.65rem",
              }}
            >
              <input
                aria-label="Search players"
                onChange={(event) => setPlayerSearch(event.target.value)}
                placeholder="Search players"
                type="search"
                value={playerSearch}
                style={{
                  width: "100%",
                  padding: "0.85rem 0.95rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "var(--text-strong)",
                }}
              />
              <select
                aria-label="Focus player"
                onChange={(event) => updateFocusPlayer(event.target.value)}
                value={selectedOption?.id ?? ""}
                style={{
                  width: "100%",
                  padding: "0.85rem 0.95rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(59, 130, 246, 0.26)",
                  background: "rgba(7, 12, 28, 0.86)",
                  color: "var(--text-strong)",
                }}
              >
                {filteredOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardPanel>
  );
}
