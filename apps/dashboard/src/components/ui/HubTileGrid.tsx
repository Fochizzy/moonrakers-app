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
    <div className="card-grid">
      {tiles.map((tile) => (
        <Link className="tile" href={tile.href} key={tile.key}>
          <span className="eyebrow">{tile.eyebrow}</span>
          <span className="tile__title">{tile.title}</span>
          <span className="tile__copy">{tile.description}</span>
          {tile.bestFor ? (
            <span className="tile__meta">Best for {tile.bestFor}</span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
