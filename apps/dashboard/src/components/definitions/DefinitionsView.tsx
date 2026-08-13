"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DefinitionRichText } from "@/components/definitions/DefinitionRichText";
import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { DefinitionSection } from "@/lib/definitions/definitionsScreen";
import {
  filterDefinitionSections,
  resolveInitialCategory,
} from "@/lib/definitions/filterDefinitionSections";

type DefinitionsViewProps = {
  category: string | null;
  metric: string | null;
  sections: DefinitionSection[];
  sourceLabel: string | null;
};

function CategoryTab({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      onClick={onSelect}
      style={{
        padding: "0.55rem 0.95rem",
        borderRadius: "999px",
        border: `1px solid ${active ? "rgba(168, 85, 247, 0.45)" : "var(--border)"}`,
        background: active
          ? "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(59, 130, 246, 0.14) 100%)"
          : "rgba(255, 255, 255, 0.04)",
        color: active ? "var(--text-strong)" : "var(--sub)",
        cursor: "pointer",
        fontSize: "0.85rem",
        fontWeight: active ? 700 : 600,
        whiteSpace: "nowrap",
      }}
      type="button"
    >
      {label}
    </button>
  );
}

export function DefinitionsView({
  category,
  metric,
  sections,
  sourceLabel,
}: DefinitionsViewProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(() =>
    resolveInitialCategory(sections, metric, category),
  );

  useEffect(() => {
    if (!metric) {
      return;
    }

    const target = document.getElementById(`definition-${metric}`);
    if (typeof target?.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [metric]);

  const visibleSections = useMemo(
    () => filterDefinitionSections({ activeCategory, query, sections }),
    [activeCategory, query, sections],
  );

  const totalTerms = useMemo(
    () => sections.reduce((count, section) => count + section.items.length, 0),
    [sections],
  );
  const visibleTerms = visibleSections.reduce(
    (count, section) => count + section.items.length,
    0,
  );

  return (
    <section className="view-stack">
      <DashboardPanel padding="spacious" tone="accent">
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <SectionHeading
            copy="Every metric this dashboard and the app publish, with the exact way each one is calculated."
            eyebrow="Reference"
            title="Definitions"
          />

          {sourceLabel ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  color: "var(--muted)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Opened from
              </span>
              <span className="dashboard-chip">{sourceLabel}</span>
            </div>
          ) : null}

          <label style={{ display: "grid", gap: "0.45rem" }}>
            <span
              style={{
                color: "var(--sub)",
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Search
            </span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search metrics or jump to a category"
              style={{
                width: "100%",
                padding: "0.85rem 1rem",
                borderRadius: "0.9rem",
                border: "1px solid var(--border-strong)",
                background: "rgba(255, 255, 255, 0.04)",
                color: "var(--text-strong)",
                fontSize: "1rem",
              }}
              type="search"
              value={query}
            />
          </label>

          <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
            <CategoryTab
              active={activeCategory === "all"}
              label="All"
              onSelect={() => setActiveCategory("all")}
            />
            {sections.map((section) => (
              <CategoryTab
                active={activeCategory === section.key}
                key={section.key}
                label={section.title}
                onSelect={() => setActiveCategory(section.key)}
              />
            ))}
          </div>

          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
            Showing {visibleTerms} of {totalTerms} tracked metrics.
          </p>
        </div>
      </DashboardPanel>

      {visibleSections.length === 0 ? (
        <EmptyStatePanel
          copy="No metric matches that search. Clear the search box or pick a different category to browse the full reference."
          eyebrow="Reference"
          title="No matching definitions"
        />
      ) : null}

      {visibleSections.map((section) => (
        <DashboardPanel key={section.key} padding="spacious">
          <div style={{ display: "grid", gap: "1.1rem" }}>
            <SectionHeading
              copy={section.subtitle}
              eyebrow="Category"
              title={section.title}
            />

            <div style={{ display: "grid", gap: "0.85rem" }}>
              {section.items.map((item) => {
                const highlighted = item.key === metric;

                return (
                  <article
                    id={`definition-${item.key}`}
                    key={item.key}
                    style={{
                      display: "grid",
                      gap: "0.6rem",
                      padding: "1rem 1.1rem",
                      borderRadius: "1.1rem",
                      border: `1px solid ${
                        highlighted ? "rgba(45, 212, 191, 0.5)" : "var(--border)"
                      }`,
                      background: highlighted
                        ? "rgba(45, 212, 191, 0.08)"
                        : "rgba(255, 255, 255, 0.03)",
                      scrollMarginTop: "1.5rem",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        color: "var(--text-strong)",
                        fontSize: "1.1rem",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {item.title}
                    </h3>

                    <DefinitionRichText
                      activeMetric={item.key}
                      lines={item.bodyLines}
                    />

                    {item.related.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--muted)",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                          }}
                        >
                          Related
                        </span>
                        {item.related.map((related) => (
                          <Link
                            href={`/definitions?metric=${encodeURIComponent(
                              related.key,
                            )}&category=${encodeURIComponent(related.category)}`}
                            key={`${item.key}-${related.key}`}
                            style={{
                              padding: "0.35rem 0.7rem",
                              borderRadius: "999px",
                              border: "1px solid var(--border)",
                              background: "rgba(255, 255, 255, 0.05)",
                              color: "var(--text)",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                            }}
                          >
                            {related.title}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </DashboardPanel>
      ))}
    </section>
  );
}
