"use client";

import { useState } from "react";

import { PREVIEW_CREW, type PreviewCrewMember } from "./previewData";

/**
 * A web reproduction of the phone game screen, opened on a real turn: the 20th
 * turn of the most recent four-player game, with the totals every other seat
 * was holding at that moment. The numbers are not decoration — the strip runs
 * the same arithmetic as `engine/gameEngine.ts`, so a visitor poking at the
 * steppers sees what the app would actually record.
 */

const ACTIVE_PLAYER_ID = "lurker";
const ROUND_NUMBER = 5;

const SCORE_PER_CONTRACT = 5;
const SCORE_PER_ASSIST = 3;
const SCORE_PER_FAILURE = 4;

type CommittedTotals = {
  assistPrestigeReceived: number;
  assists: number;
  contracts: number;
  directPrestige: number;
  failures: number;
  objectivePrestige: number;
};

/** What each seat had banked across the 19 turns before this one. */
const COMMITTED_TOTALS: Record<string, CommittedTotals> = {
  lurker: {
    directPrestige: 5,
    objectivePrestige: 0,
    assistPrestigeReceived: 0,
    contracts: 4,
    assists: 5,
    failures: 0,
  },
  gregmtg: {
    directPrestige: 9,
    objectivePrestige: 1,
    assistPrestigeReceived: 2,
    contracts: 4,
    assists: 2,
    failures: 1,
  },
  fochizzy: {
    directPrestige: 7,
    objectivePrestige: 1,
    assistPrestigeReceived: 2,
    contracts: 4,
    assists: 2,
    failures: 0,
  },
  revloki: {
    directPrestige: 9,
    objectivePrestige: 1,
    assistPrestigeReceived: 2,
    contracts: 4,
    assists: 1,
    failures: 0,
  },
};

type ContractChoice = "failure" | "success" | null;
/** `null` is the row's "No"; a number is "Yes" with that much assist prestige. */
type AssistSelection = Record<string, number | null>;

/** The turn as it was actually played: 5 prestige, contract made, one assist. */
const INITIAL_PRESTIGE = 5;
const INITIAL_CONTRACT: ContractChoice = "success";
const INITIAL_ASSISTS: AssistSelection = {
  fochizzy: 1,
  gregmtg: null,
  revloki: null,
};
const INITIAL_OBJECTIVES: Record<string, number> = {
  lurker: 1,
  gregmtg: 0,
  fochizzy: 0,
  revloki: 0,
};

function clampCount(value: number) {
  return Math.max(0, Math.floor(value));
}

function buildLiveTotals({
  assists,
  contract,
  objectives,
  prestige,
}: {
  assists: AssistSelection;
  contract: ContractChoice;
  objectives: Record<string, number>;
  prestige: number;
}) {
  const totals = Object.fromEntries(
    PREVIEW_CREW.map((member) => [
      member.id,
      { ...(COMMITTED_TOTALS[member.id] as CommittedTotals) },
    ]),
  ) as Record<string, CommittedTotals>;

  const actor = totals[ACTIVE_PLAYER_ID];

  actor.directPrestige += prestige;
  actor.contracts += contract === "success" ? 1 : 0;
  actor.failures += contract === "failure" ? 1 : 0;

  for (const [playerId, assistPrestige] of Object.entries(assists)) {
    if (assistPrestige === null) {
      continue;
    }

    actor.assists += 1;
    const recipient = totals[playerId];
    if (recipient) {
      recipient.assistPrestigeReceived += assistPrestige;
    }
  }

  for (const [playerId, count] of Object.entries(objectives)) {
    const recipient = totals[playerId];
    if (recipient) {
      recipient.objectivePrestige += count;
    }
  }

  return (
    PREVIEW_CREW.map((member) => {
      const playerTotals = totals[member.id] as CommittedTotals;
      const totalPrestige = Math.max(
        0,
        playerTotals.directPrestige +
          playerTotals.objectivePrestige +
          playerTotals.assistPrestigeReceived,
      );

      return {
        member,
        prestige: totalPrestige,
        score:
          totalPrestige +
          playerTotals.contracts * SCORE_PER_CONTRACT +
          playerTotals.assists * SCORE_PER_ASSIST -
          playerTotals.failures * SCORE_PER_FAILURE,
      };
    })
      // The phone shows the strip in leaderboard order, so it reorders live as
      // the turn is entered rather than sitting in a fixed seat order.
      .sort(
        (left, right) =>
          right.prestige - left.prestige || right.score - left.score,
      )
  );
}

function Stepper({
  disabled,
  label,
  onChange,
  size = "normal",
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (next: number) => void;
  size?: "large" | "normal";
  value: number;
}) {
  return (
    <div className={size === "large" ? "ge-stepper ge-stepper--large" : "ge-stepper"}>
      <button
        aria-label={`Decrease ${label}`}
        className="ge-stepper__button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(clampCount(value - 1))}
        type="button"
      >
        −
      </button>
      <output aria-label={label} className="ge-stepper__value">
        {value}
      </output>
      <button
        aria-label={`Increase ${label}`}
        className="ge-stepper__button"
        disabled={disabled}
        onClick={() => onChange(clampCount(value + 1))}
        type="button"
      >
        +
      </button>
    </div>
  );
}

export function GameEntryPreview() {
  const [prestige, setPrestige] = useState(INITIAL_PRESTIGE);
  const [contract, setContract] = useState<ContractChoice>(INITIAL_CONTRACT);
  const [assists, setAssists] = useState<AssistSelection>(INITIAL_ASSISTS);
  const [objectives, setObjectives] =
    useState<Record<string, number>>(INITIAL_OBJECTIVES);

  const activePlayer = PREVIEW_CREW.find(
    (member) => member.id === ACTIVE_PLAYER_ID,
  ) as PreviewCrewMember;
  const otherPlayers = PREVIEW_CREW.filter(
    (member) => member.id !== ACTIVE_PLAYER_ID,
  );
  const standings = buildLiveTotals({ assists, contract, objectives, prestige });

  function setAssistValue(playerId: string, next: number | null) {
    setAssists((current) => ({ ...current, [playerId]: next }));
  }

  return (
    <div
      className="ge-screen"
      style={{ "--ge-accent": activePlayer.accent } as React.CSSProperties}
    >
      <div className="ge-topbar">
        <span className="ge-topbar__chip">Round {ROUND_NUMBER}</span>
        <span className="ge-topbar__chip ge-topbar__chip--active">
          {activePlayer.name}
        </span>
        <span className="ge-topbar__chip">Command</span>
      </div>

      <div className="ge-strip">
        {standings.map((entry) => {
          const isActive = entry.member.id === ACTIVE_PLAYER_ID;

          return (
            <div
              className={isActive ? "ge-player ge-player--active" : "ge-player"}
              key={entry.member.id}
              style={
                { "--ge-player-accent": entry.member.accent } as React.CSSProperties
              }
            >
              <span className="ge-player__name">{entry.member.name}</span>
              <span
                aria-label={`${entry.member.name} prestige and score`}
                className="ge-player__totals"
              >
                <span className="ge-player__stat">P: {entry.prestige}</span>
                <span className="ge-player__stat">S: {entry.score}</span>
              </span>
            </div>
          );
        })}
      </div>

      <section className="ge-panel ge-panel--active">
        <h3 className="ge-panel__title">Direct Prestige</h3>
        <Stepper
          label="Direct prestige"
          onChange={setPrestige}
          size="large"
          value={prestige}
        />

        <div className="ge-choices">
          <button
            aria-pressed={contract === "success"}
            className="ge-choice ge-choice--success"
            onClick={() =>
              setContract(contract === "success" ? null : "success")
            }
            type="button"
          >
            <span aria-hidden="true">✓</span> Contract Succeeded
          </button>
          <button
            aria-pressed={contract === "failure"}
            className="ge-choice ge-choice--failure"
            onClick={() =>
              setContract(contract === "failure" ? null : "failure")
            }
            type="button"
          >
            <span aria-hidden="true">✕</span> Contract Failed
          </button>
        </div>

        <button className="ge-wide-button" type="button">
          Head to Head Mission
        </button>
      </section>

      <section className="ge-panel">
        <div className="ge-panel__head">
          <h3 className="ge-panel__title">Assists</h3>
          <button
            className="ge-none-chip"
            onClick={() =>
              setAssists(
                Object.fromEntries(
                  otherPlayers.map((member) => [member.id, null]),
                ),
              )
            }
            type="button"
          >
            None
          </button>
        </div>

        {otherPlayers.map((member) => {
          const selection = assists[member.id] ?? null;
          const assisted = selection !== null;

          return (
            <div className="ge-row" key={member.id}>
              <span className="ge-row__player">
                <span
                  aria-hidden="true"
                  className="ge-row__dot"
                  style={{ background: member.accent }}
                />
                {member.name}
              </span>

              <span className="ge-toggle">
                <button
                  aria-label={`${member.name} not assisted`}
                  aria-pressed={!assisted}
                  className="ge-toggle__button"
                  onClick={() => setAssistValue(member.id, null)}
                  type="button"
                >
                  No
                </button>
                <button
                  aria-label={`${member.name} assisted`}
                  aria-pressed={assisted}
                  className="ge-toggle__button"
                  onClick={() => setAssistValue(member.id, selection ?? 1)}
                  type="button"
                >
                  Yes
                </button>
              </span>

              <Stepper
                disabled={!assisted}
                label={`Assist prestige for ${member.name}`}
                onChange={(next) => setAssistValue(member.id, next)}
                value={selection ?? 0}
              />
            </div>
          );
        })}
      </section>

      <section className="ge-panel">
        <div className="ge-panel__head">
          <h3 className="ge-panel__title">Objectives</h3>
          <button
            className="ge-none-chip"
            onClick={() =>
              setObjectives(
                Object.fromEntries(PREVIEW_CREW.map((member) => [member.id, 0])),
              )
            }
            type="button"
          >
            None
          </button>
        </div>

        {PREVIEW_CREW.map((member) => (
          <div className="ge-row ge-row--objective" key={member.id}>
            <span
              className={
                member.id === ACTIVE_PLAYER_ID
                  ? "ge-row__bar ge-row__bar--active"
                  : "ge-row__bar"
              }
            >
              {member.name}
            </span>
            <Stepper
              label={`Objectives for ${member.name}`}
              onChange={(next) =>
                setObjectives((current) => ({ ...current, [member.id]: next }))
              }
              value={objectives[member.id] ?? 0}
            />
          </div>
        ))}
      </section>

      <div className="ge-actions">
        <button className="ge-action" type="button">
          Edit Previous Turn
        </button>
        <button className="ge-action" type="button">
          Stay at Base
        </button>
        <button className="ge-action ge-action--primary" type="button">
          End Turn
        </button>
        <button className="ge-action ge-action--finish" type="button">
          Finish Game
        </button>
      </div>
    </div>
  );
}
