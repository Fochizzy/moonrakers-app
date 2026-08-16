import type { InsightsScreenPayload } from "@moonrakers/analytics-contract";

import { asArray, asRecord, toText } from "@/components/charts/chartUtils";
import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCount, MISSING, toFiniteNumber } from "@/lib/formatNumber";

function toNumber(value: unknown) {
  return toFiniteNumber(value);
}

/**
 * Server signal copy is written with `--` where an em dash belongs.
 */
function cleanCopy(value: string) {
  return value.replace(/\s--\s/g, " — ");
}

const TONE_COLORS: Record<string, string> = {
  accent: "var(--accent)",
  blue: "var(--blue)",
  danger: "var(--danger)",
  success: "var(--gold)",
};

/**
 * Correlation rows come in two shapes: win/lose splits carry a written
 * `description`, while macro, pairing, and personal rows carry a numeric
 * `value` plus a `strength` label. Render whichever the row actually has
 * rather than falling back to placeholder copy.
 */
function toCorrelationRows(value: unknown, groupKey: string) {
  return asArray(value).map((entry, index) => {
    const row = asRecord(entry);
    const numeric = toNumber(row.value);

    return {
      body: toText(row.meaning ?? row.description ?? row.summary),
      key: `${groupKey}-${toText(row.key ?? row.metricKey ?? row.label, String(index))}`,
      label: toText(
        row.label ?? row.title ?? row.metricLabel,
        `Correlation ${index + 1}`,
      ),
      strength: toText(row.strength),
      value: numeric,
    };
  });
}

function CorrelationGroup({
  copy,
  eyebrow,
  rows,
  title,
}: {
  copy?: string;
  eyebrow: string;
  rows: ReturnType<typeof toCorrelationRows>;
  title: string;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <DashboardPanel padding="normal">
      <div className="panel-head">
        <div className="panel-head__text">
          <p className="eyebrow" style={{ margin: 0 }}>
            {eyebrow}
          </p>
          <h2 className="panel-title">{title}</h2>
          {copy ? <p className="panel-copy">{copy}</p> : null}
        </div>
        <span className="panel-count">{rows.length} tracked</span>
      </div>

      <div className="card-grid">
        {rows.map((row) => (
          <div className="tile" key={row.key}>
            <span className="stat__label">{row.label}</span>
            {row.value !== null ? (
              <span className="tile__title" style={{ fontVariantNumeric: "tabular-nums" }}>
                {row.value > 0 ? "+" : ""}
                {row.value.toFixed(2)}
                {row.strength ? (
                  <span className="tile__meta"> · {row.strength}</span>
                ) : null}
              </span>
            ) : row.strength ? (
              <span className="tile__meta">{row.strength}</span>
            ) : null}
            {row.body ? <span className="tile__copy">{row.body}</span> : null}
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

export function InsightsView({ payload }: { payload: InsightsScreenPayload }) {
  const loose = payload as unknown as Record<string, unknown>;
  const meta = asRecord(payload.meta);
  const topSignals = asArray(loose.topSignals);
  const relationships = asRecord(payload.relationships);
  const correlations = asRecord(payload.correlations);
  const rivalries = asArray(loose.rivalries);
  const assistNetwork = asRecord(loose.assistNetwork);
  const assistPlayers = asArray(assistNetwork.nodes ?? assistNetwork.players);
  const assistEdges = asArray(assistNetwork.edges ?? assistNetwork.relationships);
  const playerNames = new Map(
    assistPlayers.map((entry) => {
      const node = asRecord(entry);
      return [toText(node.id), toText(node.label ?? node.name)];
    }),
  );

  // An unwritten summary used to be replaced by a sentence describing the
  // feature, which read as the page's actual headline.
  const summary =
    toText(relationships.summary) || toText(correlations.summary) || "";
  const games = toNumber(meta.games);

  const outcomeRows = toCorrelationRows(
    correlations.items ?? correlations.winLoseSplit,
    "outcome",
  );
  const macroRows = toCorrelationRows(correlations.macro, "macro");
  const personalRows = toCorrelationRows(correlations.personal, "personal");
  const pairingRows = toCorrelationRows(correlations.pairing, "pairing");

  return (
    <section className="view-stack">
      <PageHeader
        copy={summary ? cleanCopy(summary) : undefined}
        eyebrow="Insights"
        meta={
          games === null
            ? undefined
            : `Published over ${formatCount(games)} tracked games.`
        }
        title="Signals and relationships"
      />

      {topSignals.length > 0 ? (
        <div className="stat-grid">
          {topSignals.map((signal, index) => {
            const row = asRecord(signal);
            const tone = TONE_COLORS[toText(row.tone)] ?? "var(--border-strong)";

            return (
              <article
                className="stat"
                key={toText(row.key, `signal-${index}`)}
                style={{ "--stat-accent": tone } as React.CSSProperties}
              >
                <p className="stat__label" style={{ margin: 0 }}>
                  {toText(row.label, `Signal ${index + 1}`)}
                </p>
                <p
                  className="stat__value stat__value--text"
                  style={{ margin: 0, color: tone }}
                >
                  {toText(row.value, MISSING)}
                </p>
                {toText(row.meaning) ? (
                  <p className="stat__detail" style={{ margin: 0 }}>
                    {cleanCopy(toText(row.meaning))}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyStatePanel
          copy="The insights route is connected, but this payload did not include any top-signal cards yet."
          eyebrow="Signals"
          title="No top signals returned"
        />
      )}

      {rivalries.length > 0 ? (
        <DashboardPanel padding="normal">
          <div className="panel-head">
            <div className="panel-head__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Head to head
              </p>
              <h2 className="panel-title">Rivalries</h2>
              <p className="panel-copy">
                Moonrakers has no draws — the last column counts shared games a
                third player won.
              </p>
            </div>
            <span className="panel-count">{rivalries.length} opponents</span>
          </div>

          <div className="table-scroll">
            <table className="data-table data-table--compact">
              <thead>
                <tr>
                  <th className="col-text">Opponent</th>
                  <th>Games together</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>Others won</th>
                </tr>
              </thead>
              <tbody>
                {rivalries.map((entry, index) => {
                  const row = asRecord(entry);

                  return (
                    <tr key={toText(row.opponentId, `rival-${index}`)}>
                      <td className="col-text is-strong">
                        {toText(row.opponentName, "Opponent")}
                      </td>
                      <td>{formatCount(row.gamesTogether)}</td>
                      <td className="is-good">{formatCount(row.wins)}</td>
                      <td>{formatCount(row.losses)}</td>
                      <td className="is-muted">{formatCount(row.draws)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : null}

      {assistPlayers.length > 0 ? (
        <DashboardPanel padding="normal">
          <div className="panel-head">
            <div className="panel-head__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Support
              </p>
              <h2 className="panel-title">Assist network</h2>
              <p className="panel-copy">
                Who feeds whom, and how much prestige moves with each assist.
              </p>
            </div>
            <span className="panel-count">
              {assistPlayers.length} players · {assistEdges.length} lanes
            </span>
          </div>

          <div className="stack-md">
            <div className="table-scroll">
              <table className="data-table data-table--compact">
                <thead>
                  <tr>
                    <th className="col-text">Player</th>
                    <th>Assists given</th>
                    <th>Prestige given</th>
                    <th>Assists received</th>
                    <th>Prestige received</th>
                  </tr>
                </thead>
                <tbody>
                  {assistPlayers.map((entry, index) => {
                    const node = asRecord(entry);

                    return (
                      <tr key={toText(node.id, `node-${index}`)}>
                        <td className="col-text is-strong">
                          {toText(node.label ?? node.name, "Player")}
                        </td>
                        <td>{formatCount(node.assistsGiven)}</td>
                        <td>{formatCount(node.prestigeGiven)}</td>
                        <td>{formatCount(node.assistsReceived)}</td>
                        <td>{formatCount(node.prestigeReceived)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {assistEdges.length > 0 ? (
              <div className="table-scroll">
                <table className="data-table data-table--compact">
                  <thead>
                    <tr>
                      <th className="col-text">Assist lane</th>
                      <th>Assists</th>
                      <th>Prestige</th>
                      <th>Per game</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assistEdges.map((entry, index) => {
                      const edge = asRecord(entry);
                      const fromId = toText(edge.fromId);
                      const toId = toText(edge.toId);
                      const perGame = toNumber(edge.assistFrequencyPerGame);

                      return (
                        <tr key={`${fromId}-${toId}-${index}`}>
                          <td className="col-text is-strong">
                            {playerNames.get(fromId) ?? MISSING} →{" "}
                            {playerNames.get(toId) ?? MISSING}
                          </td>
                          <td>{formatCount(edge.assistCount)}</td>
                          <td>{formatCount(edge.assistPrestige)}</td>
                          <td className="is-muted">
                            {perGame !== null ? perGame.toFixed(2) : MISSING}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </DashboardPanel>
      ) : null}

      <CorrelationGroup
        copy="How each metric splits between your wins and your losses."
        eyebrow="Outcomes"
        rows={outcomeRows}
        title="Win/loss splits"
      />

      <CorrelationGroup
        copy="Table-wide correlations against win rate."
        eyebrow="Correlations"
        rows={macroRows}
        title="Macro correlations"
      />

      <CorrelationGroup
        copy="Correlations scoped to the focused player."
        eyebrow="Correlations"
        rows={personalRows}
        title="Personal correlations"
      />

      <CorrelationGroup
        copy="How win rate moves when each crewmate is at the table."
        eyebrow="Correlations"
        rows={pairingRows}
        title="Pairing correlations"
      />
    </section>
  );
}
