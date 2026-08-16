import Link from "next/link";
import type { PlayerProfileScreenPayload } from "@moonrakers/analytics-contract";

import { asArray, asRecord, toText } from "@/components/charts/chartUtils";
import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatShortDate } from "@/lib/formatDateTime";
import {
  formatCount,
  formatPercent,
  formatRating,
  formatRecord,
} from "@/lib/formatNumber";
import { assignDistinctAccents } from "@/lib/playerColor";

/**
 * The hero row already states these, so a section repeating them is noise. Any
 * other card in a section is what makes that section worth opening.
 */
const HERO_LABELS = new Set([
  "current elo",
  "peak elo",
  "win rate",
  "record",
  "rated games",
]);

function isHeroLabel(label: string) {
  return HERO_LABELS.has(label.trim().toLowerCase());
}

type RecentGame = {
  finishedAt: string;
  groupName: string;
  id: string;
  players: Array<{
    color: string | null;
    id: string;
    isWinner: boolean;
    name: string;
    totalPrestige: number;
  }>;
  playerPrestige: number | null;
  won: boolean;
  winnerName: string;
};

/**
 * `recentGames` carries the full roster for each game. The view previously
 * rendered a placeholder sentence over the top of it.
 */
function toRecentGames(
  value: unknown,
  focusPlayerId: string,
): RecentGame[] {
  return asArray(value).map((entry, index) => {
    const game = asRecord(entry);
    const players = asArray(game.players).map((playerEntry, playerIndex) => {
      const player = asRecord(playerEntry);
      const id = toText(player.id ?? player.profileId, `player-${playerIndex}`);

      return {
        color: toText(player.color) || null,
        id,
        isWinner: player.isWinner === true,
        name: toText(player.name, "Player"),
        totalPrestige: Number(player.totalPrestige) || 0,
      };
    });

    const focusPlayer = players.find((player) => player.id === focusPlayerId);
    const winner = players.find((player) => player.isWinner);

    return {
      finishedAt: toText(game.finishedAt ?? game.createdAt),
      groupName: toText(game.groupName),
      id: toText(game.gameId ?? game.id, `recent-game-${index}`),
      playerPrestige: focusPlayer ? focusPlayer.totalPrestige : null,
      players,
      winnerName: winner?.name ?? "",
      won: Boolean(focusPlayer?.isWinner),
    };
  });
}

export function ProfileView({ payload }: { payload: PlayerProfileScreenPayload }) {
  const selectedPlayerId = payload.selectedPlayerId ?? payload.hero.id ?? "";
  const compareLabel = payload.quickActions?.compareLabel?.trim() || "Compare player";
  const heroDetails = new Map(
    payload.topCards.map((card) => [
      card.label.trim().toLowerCase(),
      card.sub?.trim() || undefined,
    ]),
  );
  const extraTopCards = payload.topCards.filter(
    (card) => !isHeroLabel(card.label),
  );
  const profileSections = Object.entries(payload.tabs)
    .map(([key, section]) => ({
      cards: section.cards.filter((card) => !isHeroLabel(card.label)),
      key,
      title: section.title,
    }))
    .filter((section) => section.cards.length > 0);
  const recentGames = toRecentGames(payload.recentGames, selectedPlayerId);

  return (
    <section className="view-stack">
      <PageHeader
        actions={
          <Link
            className="btn btn--primary"
            href={`/compare?focusPlayerId=${encodeURIComponent(selectedPlayerId)}`}
          >
            {compareLabel}
          </Link>
        }
        copy={payload.profileInsight?.body}
        eyebrow="Profile"
        meta={`${formatCount(payload.hero.totalGames)} rated games · ${formatRecord(
          payload.hero.totalWins,
          payload.hero.totalGames - payload.hero.totalWins,
        )}`}
        title={payload.hero.name}
      />

      <div className="stat-grid">
        <MetricCard
          accent="var(--accent)"
          detail={heroDetails.get("current elo")}
          label="Current ELO"
          value={formatRating(payload.hero.currentElo)}
        />
        <MetricCard
          accent="var(--blue)"
          detail={heroDetails.get("peak elo")}
          label="Peak ELO"
          value={formatRating(payload.hero.peakElo)}
        />
        <MetricCard
          accent="var(--gold)"
          detail={heroDetails.get("win rate")}
          label="Win rate"
          value={formatPercent(payload.hero.winRate)}
        />
        <MetricCard
          label="Record"
          value={formatRecord(
            payload.hero.totalWins,
            payload.hero.totalGames - payload.hero.totalWins,
          )}
        />
      </div>

      {extraTopCards.length > 0 ? (
        <div className="stat-grid">
          {extraTopCards.map((card) => (
            <MetricCard
              detail={card.sub ?? undefined}
              key={card.key}
              label={card.label}
              value={card.value}
            />
          ))}
        </div>
      ) : null}

      {profileSections.map((section) => (
        <DashboardPanel key={section.key} padding="normal">
          <SectionHeading
            eyebrow="Profile section"
            title={section.title}
          />
          <div className="stat-grid">
            {section.cards.map((card) => (
              <MetricCard
                detail={card.sub ?? undefined}
                key={card.key}
                label={card.label}
                value={card.value}
              />
            ))}
          </div>
        </DashboardPanel>
      ))}

      <DashboardPanel padding="normal">
        <div className="panel-head">
          <div className="panel-head__text">
            <p className="eyebrow" style={{ margin: 0 }}>
              Recent games
            </p>
            <h2 className="panel-title">Latest table history</h2>
          </div>
          <Link className="btn" href="/history">
            Full archive
          </Link>
        </div>

        {recentGames.length > 0 ? (
          <div className="row-list">
            {recentGames.map((game) => {
              const accents = assignDistinctAccents(game.players);
              const winnerId =
                game.players.find((player) => player.isWinner)?.id ?? null;

              return (
                <article
                  className="row"
                  key={game.id}
                  style={
                    {
                      "--row-accent":
                        (winnerId && accents[winnerId]) || "var(--border-strong)",
                    } as React.CSSProperties
                  }
                >
                  <div className="row__head">
                    <div className="stack-sm" style={{ minWidth: 0 }}>
                      <span className="eyebrow" suppressHydrationWarning>
                        {game.finishedAt
                          ? formatShortDate(game.finishedAt)
                          : "Saved game"}
                        {game.groupName ? ` · ${game.groupName}` : ""}
                      </span>
                      <h3 className="row__title">
                        {game.won
                          ? `Won with ${formatCount(game.playerPrestige)}`
                          : game.winnerName
                            ? `${game.winnerName} won`
                            : "No winner recorded"}
                      </h3>
                      {!game.won && game.playerPrestige !== null ? (
                        <p className="row__meta">
                          {formatCount(game.playerPrestige)} prestige ·{" "}
                          {game.players.length} players
                        </p>
                      ) : (
                        <p className="row__meta">
                          {game.players.length} players
                        </p>
                      )}
                    </div>

                    <div className="page-header__actions">
                      <Link
                        className="btn btn--primary"
                        href={`/summary/${encodeURIComponent(game.id)}`}
                      >
                        Summary
                      </Link>
                      <Link
                        className="btn"
                        href={`/game-trends/${encodeURIComponent(game.id)}`}
                      >
                        Trends
                      </Link>
                    </div>
                  </div>

                  <div className="pill-row">
                    {game.players.map((player) => (
                      <span
                        className={player.isWinner ? "chip chip--win" : "chip"}
                        key={`${game.id}-${player.id}`}
                      >
                        <span
                          aria-hidden="true"
                          className="chip__dot"
                          style={{ background: accents[player.id] }}
                        />
                        {player.name}
                        <span className="chip__num">{player.totalPrestige}</span>
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyStatePanel
            copy="Games this player finished will appear here once they are saved to the cloud."
            eyebrow="Recent games"
            title="No recent games returned"
          />
        )}
      </DashboardPanel>
    </section>
  );
}
