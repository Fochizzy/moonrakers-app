 "use client";

import {
  useDeferredValue,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";


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
  const [isFocusPending, startFocusTransition] = useTransition();
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

    startFocusTransition(() => {
      router.push(nextHref);
    });
  }

  return (
    <header className="topbar">
      <div className="topbar__identity">
        <span
          aria-hidden="true"
          className="chip__dot"
          style={{
            background: profileAccent,
            boxShadow: `0 0 12px ${profileAccent}`,
            width: "0.6rem",
            height: "0.6rem",
          }}
        />
        <span className="stat__label">Active pilot</span>
        <span className="topbar__name">{profileName}</span>
      </div>

      {playerOptions.length > 0 ? (
        <div className="topbar__controls">
          <span aria-live="polite" className="stat__label" role="status">
            {isFocusPending ? "Loading player focus..." : "Player focus"}
          </span>
          <input
            aria-label="Search players"
            className="input"
            onChange={(event) => setPlayerSearch(event.target.value)}
            placeholder="Search players"
            type="search"
            value={playerSearch}
          />
          <select
            aria-label="Focus player"
            aria-busy={isFocusPending}
            className="select"
            defaultValue={selectedOption?.id ?? ""}
            key={requestedFocusPlayerId}
            onChange={(event) => updateFocusPlayer(event.target.value)}
          >
            {filteredOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </header>
  );
}
