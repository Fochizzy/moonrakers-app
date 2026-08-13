import Link from "next/link";

export type HubTile = {
  bestFor?: string;
  description: string;
  eyebrow: string;
  href: string;
  key: string;
  title: string;
};

export function HubTileGrid({ tiles }: { tiles: HubTile[] }) {
  return (
    <div className="metric-grid">
      {tiles.map((tile) => (
        <Link
          href={tile.href}
          key={tile.key}
          style={{
            display: "grid",
            alignContent: "start",
            gap: "0.5rem",
            padding: "1.15rem",
            borderRadius: "1.2rem",
            border: "1px solid var(--border)",
            background:
              "linear-gradient(160deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
            minHeight: "100%",
          }}
        >
          <span className="section-eyebrow">{tile.eyebrow}</span>
          <span
            style={{
              color: "var(--text-strong)",
              fontSize: "1.2rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            {tile.title}
          </span>
          <span style={{ color: "var(--sub)", fontSize: "0.95rem", lineHeight: 1.6 }}>
            {tile.description}
          </span>
          {tile.bestFor ? (
            <span
              style={{
                justifySelf: "start",
                marginTop: "0.25rem",
                padding: "0.3rem 0.65rem",
                borderRadius: "999px",
                border: "1px solid var(--border)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--muted)",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            >
              Best for {tile.bestFor}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
