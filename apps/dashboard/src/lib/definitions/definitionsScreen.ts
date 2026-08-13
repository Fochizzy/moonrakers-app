import {
  DEFINITION_GROUPS,
  findDefinitionTextSegments,
  getDefinitionItem,
  getRelatedDefinitionKeys,
} from "../../../../../utils/definitionCatalog";

export type DefinitionSegment =
  | { type: "text"; text: string }
  | { type: "term"; text: string; metric: string | null; category: string | null };

export type DefinitionBodyLine = {
  bullet: boolean;
  segments: DefinitionSegment[];
};

export type DefinitionRelatedLink = {
  category: string;
  key: string;
  title: string;
};

export type DefinitionEntry = {
  body: string;
  bodyLines: DefinitionBodyLine[];
  key: string;
  related: DefinitionRelatedLink[];
  title: string;
};

export type DefinitionSection = {
  items: DefinitionEntry[];
  key: string;
  subtitle: string;
  title: string;
};

function toSegments(text: string): DefinitionSegment[] {
  return findDefinitionTextSegments(text).map((segment) =>
    segment.type === "term"
      ? {
          type: "term" as const,
          text: segment.text,
          metric: segment.metric ?? null,
          category: segment.category ?? null,
        }
      : { type: "text" as const, text: segment.text },
  );
}

function toBodyLines(body: string): DefinitionBodyLine[] {
  return String(body ?? "")
    .split("\n")
    .map((rawLine) => {
      const trimmed = rawLine.trim();
      const bullet = trimmed.startsWith("- ");
      const content = bullet ? trimmed.slice(2) : rawLine.trim();

      return { bullet, segments: toSegments(content) };
    })
    .filter((line) => line.segments.some((segment) => segment.text.length > 0));
}

/**
 * Build the fully serializable definitions model on the server so the browser
 * bundle never has to carry the whole metric catalog or its term matcher.
 */
export function buildDefinitionSections(): DefinitionSection[] {
  return [...DEFINITION_GROUPS]
    .sort((left, right) =>
      left.title.localeCompare(right.title, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .map((group) => ({
      key: group.key,
      subtitle: group.subtitle,
      title: group.title,
      items: group.items.map((item) => ({
        body: item.body,
        bodyLines: toBodyLines(item.body),
        key: item.key,
        title: item.title,
        related: getRelatedDefinitionKeys(item.key)
          .map((relatedKey) => {
            const relatedItem = getDefinitionItem(relatedKey);
            return relatedItem
              ? {
                  category: group.key,
                  key: relatedItem.key,
                  title: relatedItem.title,
                }
              : null;
          })
          .filter((entry): entry is DefinitionRelatedLink => entry !== null),
      })),
    }));
}
