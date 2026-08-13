import Link from "next/link";

import type {
  DefinitionBodyLine,
  DefinitionSegment,
} from "@/lib/definitions/definitionsScreen";

type DefinitionRichTextProps = {
  activeMetric?: string | null;
  lines: DefinitionBodyLine[];
};

function SegmentText({
  activeMetric,
  segment,
}: {
  activeMetric?: string | null;
  segment: DefinitionSegment;
}) {
  if (segment.type === "text") {
    return <span>{segment.text}</span>;
  }

  const metric = String(segment.metric ?? "").trim();

  if (!metric || metric === activeMetric) {
    return <span style={{ color: "var(--text-strong)" }}>{segment.text}</span>;
  }

  const params = new URLSearchParams({ metric });
  const category = String(segment.category ?? "").trim();
  if (category) {
    params.set("category", category);
  }

  return (
    <Link
      href={`/definitions?${params.toString()}`}
      style={{
        color: "var(--gold)",
        borderBottom: "1px dashed rgba(45, 212, 191, 0.5)",
      }}
    >
      {segment.text}
    </Link>
  );
}

function renderLine(
  line: DefinitionBodyLine,
  activeMetric: string | null | undefined,
  lineKey: string,
) {
  return line.segments.map((segment, index) => (
    <SegmentText
      activeMetric={activeMetric}
      key={`${lineKey}-${index}`}
      segment={segment}
    />
  ));
}

/**
 * Renders definition copy with in-line links to the other metrics it mentions,
 * mirroring the app's DefinitionRichText behavior. Segments are precomputed on
 * the server so the browser never loads the metric catalog.
 */
export function DefinitionRichText({
  activeMetric,
  lines,
}: DefinitionRichTextProps) {
  const proseLines = lines.filter((line) => !line.bullet);
  const bulletLines = lines.filter((line) => line.bullet);

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {proseLines.length > 0 ? (
        <p
          style={{
            margin: 0,
            color: "var(--sub)",
            fontSize: "0.98rem",
            lineHeight: 1.7,
          }}
        >
          {proseLines.flatMap((line, index) =>
            renderLine(line, activeMetric, `line-${index}`),
          )}
        </p>
      ) : null}

      {bulletLines.length > 0 ? (
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.1rem",
            display: "grid",
            gap: "0.35rem",
            color: "var(--sub)",
            fontSize: "0.95rem",
            lineHeight: 1.65,
          }}
        >
          {bulletLines.map((line, index) => (
            <li key={`bullet-${index}`}>
              {renderLine(line, activeMetric, `bullet-${index}`)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
