"use client";

import type { DashboardProfile } from "@/lib/auth/profileReadiness";

type OnboardingResult = {
  ok: boolean;
  message?: string;
};

type OnboardingFormProps = {
  action: (formData: FormData) => Promise<OnboardingResult>;
  initialProfile: DashboardProfile | null;
};

const formShellStyle = {
  width: "min(100%, 38rem)",
  padding: "2rem",
  borderRadius: "1.5rem",
  border: "1px solid var(--border-strong)",
  background:
    "linear-gradient(180deg, rgba(9, 18, 38, 0.96) 0%, rgba(7, 12, 28, 0.94) 100%)",
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.38)",
} satisfies React.CSSProperties;

const fieldStyle = {
  width: "100%",
  padding: "0.95rem 1rem",
  borderRadius: "1rem",
  border: "1px solid var(--border)",
  background: "rgba(7, 12, 28, 0.78)",
  color: "var(--text-strong)",
} satisfies React.CSSProperties;

export function OnboardingForm({
  action,
  initialProfile,
}: OnboardingFormProps) {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await action(new FormData(event.currentTarget));
    if (!result.ok) {
      if (result.message) {
        window.alert(result.message);
      }
      return;
    }

    window.location.assign("/");
  }

  return (
    <section style={formShellStyle}>
      <p
        style={{
          margin: 0,
          color: "var(--gold)",
          fontSize: "0.78rem",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        Profile Bootstrap
      </p>
      <h1 style={{ margin: "0.8rem 0 0.4rem", fontSize: "2rem" }}>
        Set your player identity
      </h1>
      <p style={{ margin: 0, color: "var(--sub)", lineHeight: 1.6 }}>
        Moonrakers analytics need your published player profile before the
        dashboard can unlock stats, insights, and compare views.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}
      >
        <label style={{ display: "grid", gap: "0.45rem" }}>
          <span style={{ color: "var(--sub)", fontSize: "0.9rem" }}>Player Name</span>
          <input
            aria-label="Player Name"
            defaultValue={initialProfile?.player_name ?? ""}
            name="player_name"
            required
            style={fieldStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "0.45rem" }}>
          <span style={{ color: "var(--sub)", fontSize: "0.9rem" }}>Display Name</span>
          <input
            aria-label="Display Name"
            defaultValue={initialProfile?.display_name ?? ""}
            name="display_name"
            style={fieldStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "0.45rem" }}>
          <span style={{ color: "var(--sub)", fontSize: "0.9rem" }}>Favorite Color</span>
          <input
            aria-label="Favorite Color"
            defaultValue={initialProfile?.favorite_color ?? ""}
            name="favorite_color"
            required
            style={fieldStyle}
          />
        </label>

        <button
          style={{
            padding: "0.95rem 1rem",
            borderRadius: "1rem",
            border: "1px solid var(--accent)",
            background: "linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)",
            color: "var(--text-strong)",
            fontWeight: 700,
          }}
          type="submit"
        >
          Save Profile
        </button>
      </form>
    </section>
  );
}
