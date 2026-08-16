import { clsx } from "clsx";

type MetricCardProps = {
  accent?: string;
  detail?: string;
  label: string;
  value: string | number;
};

export function MetricCard({ accent, detail, label, value }: MetricCardProps) {
  // Long text values (a player name) must not render at numeric display size.
  const isText = typeof value === "string" && !/^[\d\s.,%+-]+$/.test(value);

  return (
    <article
      className="stat"
      style={
        accent ? ({ "--stat-accent": accent } as React.CSSProperties) : undefined
      }
    >
      <p className="stat__label" style={{ margin: 0 }}>
        {label}
      </p>
      <p
        className={clsx("stat__value", isText && "stat__value--text")}
        style={{ margin: 0, color: accent?.trim() || undefined }}
      >
        {value}
      </p>
      {detail ? (
        <p className="stat__detail" style={{ margin: 0 }}>
          {detail}
        </p>
      ) : null}
    </article>
  );
}
