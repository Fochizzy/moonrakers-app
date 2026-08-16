"use client";

import Link from "next/link";
import { useState } from "react";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatCount } from "@/lib/formatNumber";
import type { PreviewStatFamily } from "@/lib/preview/previewCatalog";
import { buildPreviewPages } from "@/lib/preview/previewPages";

import { BetaAccessDialog } from "./BetaAccessDialog";
import { ChartPreviewGallery } from "./ChartPreviewGallery";
import { GameEntryPreview } from "./GameEntryPreview";
import { PagesPreview } from "./PagesPreview";
import {
  PREVIEW_CREW,
  PREVIEW_GAME_COUNT,
  PREVIEW_LEAGUE_ROWS,
} from "./previewData";
import { StatsPreview } from "./StatsPreview";

type PreviewSection = "charts" | "game" | "pages" | "stats";

/** Anchor for the hero's "Browse the preview" link and the sticky nav. */
const SECTIONS_ID = "preview-sections";

const GAME_ENTRY_NOTES: Array<{ copy: string; title: string }> = [
  {
    title: "Turn banner",
    copy: "Which round you are on and whose turn it is. The screen takes the active player's colour so the phone can sit in the middle of the table and still be read from any seat.",
  },
  {
    title: "Live standings",
    copy: "Prestige and score for every seat, re-sorted on each entry. Nobody has to keep a running total in their head.",
  },
  {
    title: "Direct prestige",
    copy: "The turn's own haul, plus whether the contract landed or failed. A failed contract costs score, so it is a deliberate tap rather than a side effect.",
  },
  {
    title: "Assists",
    copy: "Who helped this turn and how much prestige moved to them. This is the record the assist network and every support metric is built from.",
  },
  {
    title: "Objectives",
    copy: "Bonus prestige awarded to anyone at the table, not just the active player.",
  },
  {
    title: "End the turn",
    copy: "End Turn passes the phone to the next seat. Finish Game writes the result, and every chart updates from there.",
  },
];

export function PreviewView({
  chartCount,
  families,
  metricCount,
}: {
  chartCount: number;
  families: PreviewStatFamily[];
  metricCount: number;
}) {
  const [section, setSection] = useState<PreviewSection>("charts");
  const [betaOpen, setBetaOpen] = useState(false);

  /**
   * `hint` is what the section actually contains, so the reader picks a tab on
   * purpose rather than by guessing at a one-word label.
   */
  const sections: Array<{
    count: string;
    hint: string;
    key: PreviewSection;
    label: string;
  }> = [
    {
      key: "charts",
      label: "Charts",
      count: formatCount(chartCount),
      hint: "Render any chart in the catalog against this league's games.",
    },
    {
      key: "stats",
      label: "Statistics",
      count: formatCount(metricCount),
      hint: "League totals, the ratings table, and every metric the app publishes.",
    },
    {
      key: "pages",
      label: "Pages",
      count: formatCount(buildPreviewPages(families).length),
      hint: "What each page in the app is for and what is on it.",
    },
    {
      key: "game",
      label: "Game Entry",
      count: "Try it",
      hint: "The live scoring screen, opened on a real turn. The controls work.",
    },
  ];

  const activeSection = sections.find((entry) => entry.key === section);

  const crew = PREVIEW_LEAGUE_ROWS.map((row) => ({
    ...row,
    accent: PREVIEW_CREW.find((member) => member.id === row.id)?.accent,
  }));

  return (
    <div className="preview-shell">
      <header className="preview-topbar">
        <span className="preview-wordmark">Moonraker&rsquo;s Analytics</span>
        <span className="preview-badge">Preview</span>
        <span className="preview-topbar__note">No account needed</span>
        <div className="preview-topbar__actions">
          <Link className="btn" href="/auth">
            Sign in
          </Link>
          <Link className="btn btn--primary" href="/auth">
            Create account
          </Link>
        </div>
      </header>

      <main className="preview-main">
        <section className="preview-hero">
          <div className="preview-hero__lead">
            <p className="eyebrow" style={{ margin: 0 }}>
              Preview
            </p>
            <h1 className="preview-hero__title">
              What&rsquo;s inside Moonraker&rsquo;s Analytics
            </h1>
            {/* A cold link needs to say what the product is called, and that
                the app and the board game are two different names, before it
                starts counting what is in it. */}
            <p className="preview-hero__copy">
              Moonraker&rsquo;s Analytics is the companion app for the board
              game Moonrakers. It scores a game turn by turn — prestige,
              contracts, assists, objectives — and keeps every finished game, so
              your table gets ratings, charts and a full read on each player
              instead of a photo of the final scores.
            </p>
            <p className="preview-hero__copy preview-hero__copy--sub">
              Every chart, every published metric, and the screen you score from
              are on this page, running on{" "}
              {formatCount(PREVIEW_GAME_COUNT)} real tracked games. Nothing here
              is signed in, and the players are published under aliases.
            </p>

            <div className="preview-hero__cta">
              <button
                className="btn-beta btn-beta--hero"
                onClick={() => setBetaOpen(true)}
                type="button"
              >
                Request Beta Access
              </button>
              <a className="btn preview-hero__browse" href={`#${SECTIONS_ID}`}>
                Browse the preview
              </a>
            </div>
            <p className="preview-hero__cta-note">
              Closed testing on Google Play · takes one email address · nothing
              on this page needs an account
            </p>
          </div>

          {/* The figures and the league sit together because they answer the
              same question: what is this page rendering, and off whose games. */}
          <aside className="preview-hero__aside">
            <p className="eyebrow" style={{ margin: 0 }}>
              In this preview
            </p>

            <dl className="preview-figures">
              <div className="preview-figure">
                <dt>Charts</dt>
                <dd>{formatCount(chartCount)}</dd>
              </div>
              <div className="preview-figure">
                <dt>Published metrics</dt>
                <dd>{formatCount(metricCount)}</dd>
              </div>
              <div className="preview-figure">
                <dt>Metric families</dt>
                <dd>{formatCount(families.length)}</dd>
              </div>
              <div className="preview-figure">
                <dt>Tracked games</dt>
                <dd>{formatCount(PREVIEW_GAME_COUNT)}</dd>
              </div>
            </dl>

            <div className="preview-hero__league">
              <p className="preview-hero__league-label">
                The league, by rating
              </p>
              <ul className="preview-crew" aria-label="The tracked league">
                {crew.map((member) => (
                  <li className="preview-crew__chip" key={member.id}>
                    <span
                      aria-hidden="true"
                      className="preview-crew__dot"
                      style={{ background: member.accent }}
                    />
                    <span className="preview-crew__name">{member.name}</span>
                    <span className="preview-crew__meta">
                      {formatCount(member.elo)} · {formatCount(member.games)}g
                    </span>
                  </li>
                ))}
              </ul>
              <p className="preview-hero__league-note">
                Rating, then games played. Sign in and every number on this page
                is recalculated from your own table.
              </p>
            </div>
          </aside>
        </section>

        <div className="preview-nav-rail" id={SECTIONS_ID}>
          <nav aria-label="Preview sections" className="preview-nav">
            {sections.map((entry) => (
              <button
                aria-current={section === entry.key ? "true" : undefined}
                className="preview-nav__item"
                key={entry.key}
                onClick={() => setSection(entry.key)}
                title={entry.hint}
                type="button"
              >
                {entry.label}
                {entry.count ? (
                  <span className="preview-nav__count">{entry.count}</span>
                ) : null}
              </button>
            ))}
          </nav>
          {activeSection ? (
            <p className="preview-nav__hint">{activeSection.hint}</p>
          ) : null}
        </div>

        {section === "charts" ? <ChartPreviewGallery /> : null}
        {section === "stats" ? <StatsPreview families={families} /> : null}
        {section === "pages" ? <PagesPreview families={families} /> : null}

        {section === "game" ? (
          <div className="view-stack">
            <DashboardPanel padding="normal">
              <SectionHeading
                copy="The screen you actually spend the evening on, opened on a real turn: the 20th of the most recent four-player game. The controls work — press them. The standings run the same arithmetic the app does, so the numbers move exactly as they would at the table."
                eyebrow="Live · try it"
                title="Game entry"
              />

              <div className="preview-split">
                <div className="preview-phone-rail">
                  <div className="preview-phone">
                    <GameEntryPreview />
                  </div>
                  {/* The frame scrolls internally so the notes beside it are not
                      stranded against a screen three times their height. */}
                  <p className="preview-phone-note">
                    Scroll inside the frame to reach the assists, objectives and
                    End Turn controls.
                  </p>
                </div>

                <div className="preview-notes-column">
                  <h3 className="preview-notes-title">
                    What each part of the screen does
                  </h3>
                  <ol className="preview-notes">
                    {GAME_ENTRY_NOTES.map((note) => (
                      <li className="preview-note-item" key={note.title}>
                        <h4 className="preview-note-item__title">
                          {note.title}
                        </h4>
                        <p className="preview-note-item__copy">{note.copy}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </DashboardPanel>
          </div>
        ) : null}

        {/* Sits below whichever section is open, so every preview page ends on
            the same ask. */}
        <DashboardPanel padding="spacious" tone="accent">
          <div className="preview-cta">
            <div className="preview-cta__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Next
              </p>
              <h2 className="panel-title">Play it on your own table</h2>
              {/* Two different doors, and readers were being shown both with no
                  way to tell which one is theirs. */}
              <p className="panel-copy">
                <strong>New here?</strong> Moonraker&rsquo;s Analytics is in
                closed testing on Google Play. Request access and we add the
                address you give us to the tester list.
              </p>
              <p className="panel-copy">
                <strong>Already a tester?</strong> Sign in and every chart and
                metric above runs on your games instead of this
                league&rsquo;s.
              </p>
            </div>
            <div className="preview-cta__actions">
              <button
                className="btn-beta"
                onClick={() => setBetaOpen(true)}
                type="button"
              >
                Request Beta Access
              </button>
              <Link className="btn" href="/auth">
                Sign in
              </Link>
            </div>
          </div>
        </DashboardPanel>
      </main>

      <BetaAccessDialog onClose={() => setBetaOpen(false)} open={betaOpen} />
    </div>
  );
}
