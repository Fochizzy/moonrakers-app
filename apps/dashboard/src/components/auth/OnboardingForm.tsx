"use client";

import { useState } from "react";

import type { DashboardProfile } from "@/lib/auth/profileReadiness";
import { playerAccent } from "@/lib/playerColor";

type OnboardingResult = {
  ok: boolean;
  message?: string;
};

type OnboardingFormProps = {
  action: (formData: FormData) => Promise<OnboardingResult>;
  initialProfile: DashboardProfile | null;
};

/**
 * The accent system keys off these palette names, so a typed color that is not
 * one of them silently falls back to the default blue. Offering the palette as
 * swatches makes the field a choice instead of a spelling test.
 */
const PLAYER_COLORS = ["green", "purple", "blue", "yellow", "orange"] as const;

function normalizeInitialColor(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return (PLAYER_COLORS as readonly string[]).includes(normalized)
    ? normalized
    : "blue";
}

export function OnboardingForm({
  action,
  initialProfile,
}: OnboardingFormProps) {
  const [color, setColor] = useState(() =>
    normalizeInitialColor(initialProfile?.favorite_color),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await action(new FormData(event.currentTarget));

      if (!result.ok) {
        setError(result.message ?? "Could not save your profile. Try again.");
        return;
      }

      window.location.assign("/");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save your profile. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-panel" style={{ width: "min(100%, 34rem)" }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        Profile setup
      </p>
      <h1 className="auth-panel__title">Set your player identity</h1>
      <p className="auth-panel__copy">
        Moonrakers analytics need your published player profile before the
        dashboard can unlock stats, insights, and compare views.
      </p>

      {error ? (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="auth-panel__form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Player name</span>
          <input
            aria-label="Player Name"
            className="input"
            defaultValue={initialProfile?.player_name ?? ""}
            name="player_name"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Display name (optional)</span>
          <input
            aria-label="Display Name"
            className="input"
            defaultValue={initialProfile?.display_name ?? ""}
            name="display_name"
          />
        </label>

        <fieldset className="field swatch-field">
          <legend className="field__label">Favorite color</legend>
          <input name="favorite_color" type="hidden" value={color} />
          <div className="swatch-row">
            {PLAYER_COLORS.map((name) => (
              <button
                aria-label={name}
                aria-pressed={color === name}
                className={
                  color === name ? "swatch swatch--active" : "swatch"
                }
                key={name}
                onClick={() => setColor(name)}
                style={{ "--swatch": playerAccent(name) } as React.CSSProperties}
                type="button"
              >
                <span aria-hidden="true" className="swatch__dot" />
                <span className="swatch__name">{name}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <button
          className="btn btn--primary auth-panel__submit"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}
