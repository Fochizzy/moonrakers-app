import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatCount } from "@/lib/formatNumber";
import type { PreviewStatFamily } from "@/lib/preview/previewCatalog";
import {
  buildPreviewPages,
  type PreviewPage,
} from "@/lib/preview/previewPages";

/** The phone screens have no hub tile to read from, so they are written here. */
const PHONE_PAGES: PreviewPage[] = [
  {
    key: "phone-entry",
    label: "Play",
    title: "Game entry",
    summary: "The live scoreboard the table passes round, turn by turn.",
    highlights: [
      "Prestige, contracts, assists, and objectives per turn.",
      "Standings recalculated on every entry.",
      "Edit the previous turn, or undo it outright.",
    ],
    useFor: "scoring the evening",
  },
  {
    key: "phone-setup",
    label: "Setup",
    title: "Crew and turn order",
    summary: "Pick who is playing, set colours, and lock the seating.",
    highlights: [
      "Saved groups, so a regular table is one tap.",
      "Drag to set turn order, or randomise it.",
    ],
    useFor: "starting a game",
  },
  {
    key: "phone-summary",
    label: "After",
    title: "Game summary",
    summary: "The postgame read, written the moment a game is finished.",
    highlights: [
      "Final standings with margins and prestige sources.",
      "Round-by-round trend for the game just played.",
      "Shareable result, and a CSV backup of your data.",
    ],
    useFor: "settling the argument",
  },
];

function PageCard({ page }: { page: PreviewPage }) {
  return (
    <article className="preview-page">
      <header className="preview-page__head">
        <p className="eyebrow" style={{ margin: 0 }}>
          {page.label}
        </p>
        <h3 className="preview-page__title">{page.title}</h3>
        <p className="preview-page__summary">{page.summary}</p>
      </header>

      <ul className="preview-page__list">
        {page.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>

      {page.useFor ? (
        <p className="preview-page__meta">
          <span className="preview-page__meta-label">Best for</span>
          {page.useFor}
        </p>
      ) : null}
    </article>
  );
}

export function PagesPreview({ families }: { families: PreviewStatFamily[] }) {
  const pages = buildPreviewPages(families);

  return (
    <div className="view-stack">
      <DashboardPanel padding="normal">
        <SectionHeading
          copy="What each surface is for and what is actually on it. Everything below reads from your own saved games once you are signed in."
          eyebrow="On the dashboard"
          title={`The ${formatCount(pages.length)} pages you get`}
        />

        <div className="preview-page-grid">
          {pages.map((page) => (
            <PageCard key={page.key} page={page} />
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel padding="normal" tone="blue">
        <SectionHeading
          copy="The phone app and this dashboard read the same saved games. You score on the phone; both surfaces update from there."
          eyebrow="Also included"
          title="On the phone"
        />

        <div className="preview-page-grid">
          {PHONE_PAGES.map((page) => (
            <PageCard key={page.key} page={page} />
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}
