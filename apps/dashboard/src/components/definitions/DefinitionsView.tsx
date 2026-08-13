"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DefinitionRichText } from "@/components/definitions/DefinitionRichText";
import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader
        actions={sourceLabel ? <span className="chip">From {sourceLabel}</span> : null}
        copy="Every metric this dashboard and the app publish, with the exact way each one is calculated."
        eyebrow="Reference"
        title="Definitions"
      />

      <DashboardPanel padding="normal">
        <div className="stack-md">
          <div className="toolbar">
            <label className="field toolbar__grow">
              <span className="field__label">Search</span>
              <input
                className="input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search metrics or jump to a category"
                type="search"
                value={query}
              />
            </label>
            <p className="panel-count" style={{ margin: 0, paddingBottom: "0.5rem" }}>
              Showing {visibleTerms} of {totalTerms} tracked metrics.
            </p>
          </div>

          <div className="segmented" style={{ flexWrap: "wrap" }}>
            <button
              aria-pressed={activeCategory === "all"}
              className="segmented__item"
              onClick={() => setActiveCategory("all")}
              type="button"
            >
              All
            </button>
            {sections.map((section) => (
              <button
                aria-pressed={activeCategory === section.key}
                className="segmented__item"
                key={section.key}
                onClick={() => setActiveCategory(section.key)}
                type="button"
              >
                {section.title}
              </button>
            ))}
          </div>
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
        <DashboardPanel key={section.key} padding="normal">
          <div className="panel-head">
            <div className="panel-head__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Category
              </p>
              <h2 className="panel-title">{section.title}</h2>
              <p className="panel-copy">{section.subtitle}</p>
            </div>
            <span className="panel-count">{section.items.length} metrics</span>
          </div>

          <div className="def-list">
            {section.items.map((item) => (
              <article
                className={item.key === metric ? "def def--target" : "def"}
                id={`definition-${item.key}`}
                key={item.key}
              >
                <h3 className="def__title">{item.title}</h3>

                <DefinitionRichText
                  activeMetric={item.key}
                  lines={item.bodyLines}
                />

                {item.related.length > 0 ? (
                  <div className="def__related">
                    <span className="statline__label">Related</span>
                    {item.related.map((related) => (
                      <Link
                        className="chip"
                        href={`/definitions?metric=${encodeURIComponent(
                          related.key,
                        )}&category=${encodeURIComponent(related.category)}`}
                        key={`${item.key}-${related.key}`}
                      >
                        {related.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </DashboardPanel>
      ))}
    </section>
  );
}
