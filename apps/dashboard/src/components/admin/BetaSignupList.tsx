"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatShortDate } from "@/lib/formatDateTime";

export type BetaSignupRow = {
  createdAt: string;
  email: string;
  id: string;
  invitedAt: string | null;
};

type RowState = {
  /** Set while the two-step remove is waiting for its second click. */
  confirmingRemove: boolean;
  error: string | null;
  invitedAt: string | null;
  pending: boolean;
  removed: boolean;
};

const BLANK: RowState = {
  confirmingRemove: false,
  error: null,
  invitedAt: null,
  pending: false,
  removed: false,
};

export function BetaSignupList({ rows }: { rows: BetaSignupRow[] }) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      rows.map((row) => [row.id, { ...BLANK, invitedAt: row.invitedAt }]),
    ),
  );

  function patch(id: string, next: Partial<RowState>) {
    setState((current) => ({
      ...current,
      [id]: { ...BLANK, ...current[id], ...next },
    }));
  }

  async function removeSignup(row: BetaSignupRow) {
    patch(row.id, { error: null, pending: true });

    try {
      const response = await fetch("/api/beta-access/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: row.email }),
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        ok?: boolean;
      } | null;

      if (!response.ok || !payload?.ok) {
        patch(row.id, {
          confirmingRemove: false,
          error: payload?.message ?? "Could not remove that signup.",
          pending: false,
        });
        return;
      }

      patch(row.id, { confirmingRemove: false, pending: false, removed: true });
      // The counts above the table are rendered on the server, so they stay
      // stale until the route re-runs.
      router.refresh();
    } catch {
      patch(row.id, {
        confirmingRemove: false,
        error: "Could not reach the server.",
        pending: false,
      });
    }
  }

  async function sendInvite(row: BetaSignupRow) {
    patch(row.id, { error: null, pending: true });

    try {
      const response = await fetch("/api/beta-access/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: row.email }),
      });

      const payload = (await response.json().catch(() => null)) as {
        invitedAt?: string | null;
        message?: string;
        ok?: boolean;
      } | null;

      if (!response.ok || !payload?.ok) {
        patch(row.id, {
          error: payload?.message ?? "Could not send that invite.",
          pending: false,
        });
        return;
      }

      patch(row.id, {
        error: null,
        // The server records the real timestamp; fall back to now only when
        // the send worked but the stamp did not.
        invitedAt: payload.invitedAt ?? new Date().toISOString(),
        pending: false,
      });
    } catch {
      patch(row.id, { error: "Could not reach the server.", pending: false });
    }
  }

  if (rows.length === 0) {
    return (
      <div className="empty">
        <p className="eyebrow" style={{ margin: 0 }}>
          Beta signups
        </p>
        <h3 className="empty__title">Nobody has signed up yet</h3>
        <p className="empty__copy">
          Requests from the preview page land here as soon as they arrive.
        </p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th className="col-text">Email</th>
            <th className="col-text">Requested</th>
            <th className="col-text">Invite</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowState = state[row.id] ?? {
              ...BLANK,
              invitedAt: row.invitedAt,
            };
            const sent = rowState.invitedAt !== null;

            if (rowState.removed) {
              return null;
            }

            return (
              <tr key={row.id}>
                <td className="col-text is-strong">{row.email}</td>
                {/* Server and browser format dates in their own timezone. */}
                <td className="col-text is-muted" suppressHydrationWarning>
                  {formatShortDate(row.createdAt)}
                </td>
                <td className="col-text">
                  <div className="beta-admin__action">
                    {sent ? (
                      <span className="beta-admin__sent" suppressHydrationWarning>
                        Sent {formatShortDate(rowState.invitedAt)}
                      </span>
                    ) : null}

                    <button
                      className={sent ? "btn" : "btn btn--primary"}
                      disabled={rowState.pending}
                      onClick={() => sendInvite(row)}
                      type="button"
                    >
                      {rowState.pending
                        ? "Sending…"
                        : sent
                          ? "Resend"
                          : "Send invite"}
                    </button>

                    {/* Two-step rather than a browser confirm(): this deletes
                        someone's place in the queue and cannot be undone. */}
                    {rowState.confirmingRemove ? (
                      <>
                        <span className="beta-admin__confirm">Remove?</span>
                        <button
                          className="btn btn--danger"
                          disabled={rowState.pending}
                          onClick={() => removeSignup(row)}
                          type="button"
                        >
                          {rowState.pending ? "Removing…" : "Yes, remove"}
                        </button>
                        <button
                          className="btn"
                          disabled={rowState.pending}
                          onClick={() =>
                            patch(row.id, { confirmingRemove: false })
                          }
                          type="button"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        aria-label={`Remove ${row.email}`}
                        className="btn beta-admin__remove"
                        disabled={rowState.pending}
                        onClick={() =>
                          patch(row.id, { confirmingRemove: true, error: null })
                        }
                        type="button"
                      >
                        Remove
                      </button>
                    )}

                    {rowState.error ? (
                      <span className="beta-admin__error" role="alert">
                        {rowState.error}
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
