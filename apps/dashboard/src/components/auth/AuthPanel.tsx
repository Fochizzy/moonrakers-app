"use client";

import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AuthMode = "sign-in" | "create-account";
type Notice = { tone: "error" | "info"; text: string } | null;

/**
 * Both the session guard and the recovery callback bounce here with a reason in
 * the query string, and the panel used to ignore it — the user arrived at a
 * login form with no idea why.
 */
const ARRIVAL_NOTICES: Record<string, Notice> = {
  "session-expired": {
    tone: "info",
    text: "Your session expired. Sign in again to pick up where you left off.",
  },
  "reset-sent": {
    tone: "info",
    text: "Check your email for the recovery link, then set a new password.",
  },
};

function readArrivalNotice(): Notice {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const key = params.get("reason") ?? params.get("mode") ?? "";
  return ARRIVAL_NOTICES[key] ?? null;
}

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [notice, setNotice] = useState<Notice>(readArrivalNotice);
  const [pending, setPending] = useState(false);

  const isCreating = mode === "create-account";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setPending(true);
    setNotice(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const result = isCreating
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setNotice({ tone: "error", text: result.error.message });
        return;
      }

      if (isCreating && !result.data.session) {
        setNotice({
          tone: "info",
          text: "Account created. Confirm your email address, then sign in.",
        });
        setMode("sign-in");
        return;
      }

      window.location.assign("/");
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not reach the analytics service. Try again.",
      });
    } finally {
      setPending(false);
    }
  }

  async function handleReset(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) {
      return;
    }

    const email = String(new FormData(form).get("email") ?? "").trim();
    if (!email) {
      setNotice({
        tone: "error",
        text: "Enter your email address first, then request the reset link.",
      });
      return;
    }

    setPending(true);
    setNotice(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      setNotice(
        result.error
          ? { tone: "error", text: result.error.message }
          : { tone: "info", text: `Password reset email sent to ${email}.` },
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-panel">
      <p className="eyebrow" style={{ margin: 0 }}>
        Moonrakers command access
      </p>
      <h1 className="auth-panel__title">
        {isCreating ? "Join the crew" : "Sign in"}
      </h1>
      <p className="auth-panel__copy">
        {isCreating
          ? "Create an account to start saving games and reading your analytics."
          : "Sign in to reach your games, ratings, and published analytics."}
      </p>

      <div
        className="segmented auth-panel__modes"
        role="tablist"
        aria-label="Authentication mode"
      >
        <button
          aria-pressed={!isCreating}
          className="segmented__item"
          onClick={() => setMode("sign-in")}
          type="button"
        >
          Sign In
        </button>
        <button
          aria-pressed={isCreating}
          className="segmented__item"
          onClick={() => setMode("create-account")}
          type="button"
        >
          Create Account
        </button>
      </div>

      {notice ? (
        <p
          className={
            notice.tone === "error" ? "notice notice--error" : "notice"
          }
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.text}
        </p>
      ) : null}

      <form className="auth-panel__form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Email</span>
          <input
            aria-label="Email"
            autoComplete="email"
            className="input"
            name="email"
            required
            type="email"
          />
        </label>

        <label className="field">
          <span className="field__label">Password</span>
          <input
            aria-label="Password"
            autoComplete={isCreating ? "new-password" : "current-password"}
            className="input"
            minLength={6}
            name="password"
            required
            type="password"
          />
        </label>

        <button
          className="btn btn--primary auth-panel__submit"
          disabled={pending}
          type="submit"
        >
          {pending
            ? "Working…"
            : isCreating
              ? "Create account"
              : "Continue"}
        </button>

        <button
          className="btn auth-panel__reset"
          disabled={pending}
          onClick={handleReset}
          type="button"
        >
          Send reset link
        </button>
      </form>
    </section>
  );
}
