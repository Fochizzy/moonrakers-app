type SectionHeadingProps = {
  action?: React.ReactNode;
  copy?: string;
  eyebrow: string;
  title: string;
};

export function SectionHeading({
  action,
  copy,
  eyebrow,
  title,
}: SectionHeadingProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "grid", gap: "0.45rem", minWidth: 0 }}>
        <p className="section-eyebrow" style={{ margin: 0 }}>
          {eyebrow}
        </p>
        <h2
          style={{
            margin: 0,
            color: "var(--text-strong)",
            fontSize: "clamp(1.6rem, 2.8vw, 2.4rem)",
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
          }}
        >
          {title}
        </h2>
        {copy ? (
          <p
            style={{
              margin: 0,
              color: "var(--sub)",
              fontSize: "1rem",
              lineHeight: 1.7,
              maxWidth: "44rem",
            }}
          >
            {copy}
          </p>
        ) : null}
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  );
}
