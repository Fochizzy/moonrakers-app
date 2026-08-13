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
    return <span className="term-current">{segment.text}</span>;
  }

  const params = new URLSearchParams({ metric });
  const category = String(segment.category ?? "").trim();
  if (category) {
    params.set("category", category);
  }

  return (
    <Link className="term-link" href={`/definitions?${params.toString()}`}>
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
    <div className="def__body">
      {proseLines.length > 0 ? (
        <p style={{ margin: 0 }}>
          {proseLines.flatMap((line, index) =>
            renderLine(line, activeMetric, `line-${index}`),
          )}
        </p>
      ) : null}

      {bulletLines.length > 0 ? (
        <ul>
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
