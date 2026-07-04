export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
      }}
    >
      <section
        style={{
          width: "min(720px, 100%)",
          borderRadius: "24px",
          border: "1px solid var(--border-strong)",
          background: "var(--card-alt)",
          boxShadow:
            "0 18px 48px rgba(4, 8, 20, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
          padding: "32px",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--blue)",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Moonrakers Dashboard
        </p>
        <h1
          style={{
            margin: "12px 0 8px",
            color: "var(--text-strong)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            lineHeight: 1.05,
          }}
        >
          Cloudflare-ready analytics command table
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--sub)",
            fontSize: "1rem",
            lineHeight: 1.7,
          }}
        >
          The full signed-in dashboard routes will land here next. This scaffold already
          carries the Moonrakers visual system and is wired for Cloudflare Workers.
        </p>
      </section>
    </main>
  );
}
