"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const panelStyle = {
  width: "min(100%, 34rem)",
  padding: "2rem",
  borderRadius: "1.5rem",
  border: "1px solid var(--border-strong)",
  background:
    "linear-gradient(180deg, rgba(9, 18, 38, 0.96) 0%, rgba(7, 12, 28, 0.94) 100%)",
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.38)",
} satisfies React.CSSProperties;

const toggleStyle = {
  flex: 1,
  padding: "0.8rem 1rem",
  borderRadius: "999px",
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  fontSize: "0.82rem",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
} satisfies React.CSSProperties;

const inputStyle = {
  width: "100%",
  padding: "0.95rem 1rem",
  borderRadius: "1rem",
  border: "1px solid var(--border)",
  background: "rgba(7, 12, 28, 0.78)",
  color: "var(--text-strong)",
} satisfies React.CSSProperties;

type AuthMode = "sign-in" | "create-account";

export function AuthPanel() {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createBrowserSupabaseClient();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const submitter = event.nativeEvent instanceof SubmitEvent
      ? event.nativeEvent.submitter
      : null;
    const modeValue =
      submitter instanceof HTMLButtonElement ? submitter.value : "sign-in";
    const mode: AuthMode =
      modeValue === "create-account" ? "create-account" : "sign-in";

    const result =
      mode === "create-account"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      window.alert(result.error.message);
      return;
    }

    window.location.assign("/");
  }

  async function handleReset(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();

    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    window.alert(result.error ? result.error.message : "Password reset email sent.");
  }

  return (
    <section style={panelStyle}>
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
        Moonrakers Command Access
      </p>
      <h1 style={{ margin: "0.8rem 0 0.4rem", fontSize: "2rem" }}>
        Enter your analytics bridge
      </h1>
      <p style={{ margin: 0, color: "var(--sub)", lineHeight: 1.6 }}>
        Sign in, create an account, or request a recovery link without leaving the
        Moonrakers command board.
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginTop: "1.4rem",
          padding: "0.35rem",
          borderRadius: "999px",
          background: "rgba(255, 255, 255, 0.04)",
        }}
      >
        <button
          style={{
            ...toggleStyle,
            background: "var(--accent-soft)",
            border: "1px solid var(--accent)",
          }}
          type="button"
        >
          Sign In
        </button>
        <button
          style={{
            ...toggleStyle,
            background: "rgba(45, 212, 191, 0.16)",
            border: "1px solid var(--gold)",
          }}
          type="button"
        >
          Create Account
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "1rem", marginTop: "1.4rem" }}
      >
        <label style={{ display: "grid", gap: "0.45rem" }}>
          <span style={{ color: "var(--sub)", fontSize: "0.9rem" }}>Email</span>
          <input
            aria-label="Email"
            autoComplete="email"
            name="email"
            required
            style={inputStyle}
            type="email"
          />
        </label>

        <label style={{ display: "grid", gap: "0.45rem" }}>
          <span style={{ color: "var(--sub)", fontSize: "0.9rem" }}>Password</span>
          <input
            aria-label="Password"
            autoComplete="current-password"
            minLength={6}
            name="password"
            required
            style={inputStyle}
            type="password"
          />
        </label>

        <div style={{ display: "grid", gap: "0.85rem" }}>
          <button
            style={{
              padding: "0.95rem 1rem",
              borderRadius: "1rem",
              border: "1px solid var(--accent)",
              background:
                "linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)",
              color: "var(--text-strong)",
              fontWeight: 700,
            }}
            type="submit"
            value="sign-in"
          >
            Continue
          </button>

          <button
            style={{
              padding: "0.95rem 1rem",
              borderRadius: "1rem",
              border: "1px solid var(--gold)",
              background:
                "linear-gradient(135deg, rgba(45, 212, 191, 0.24) 0%, rgba(59, 130, 246, 0.22) 100%)",
              color: "var(--text-strong)",
              fontWeight: 700,
            }}
            name="mode"
            type="submit"
            value="create-account"
          >
            Join Crew
          </button>
        </div>

        <button
          onClick={handleReset}
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "1rem",
            border: "1px solid var(--border)",
            background: "rgba(255, 255, 255, 0.03)",
            color: "var(--text)",
            fontWeight: 600,
          }}
          type="button"
        >
          Send Reset Link
        </button>
      </form>
    </section>
  );
}
