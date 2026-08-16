"use client";

import { useState } from "react";

import { formatShortDate } from "@/lib/formatDateTime";

export type BetaSignupRow = {
  createdAt: string;
  email: string;
  id: string;
  invitedAt: string | null;
};

type RowState = {
  error: string | null;
  invitedAt: string | null;
  pending: boolean;
};

export function BetaSignupList({ rows }: { rows: BetaSignupRow[] }) {
  const [state, setState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.id,
        { error: null, invitedAt: row.invitedAt, pending: false },
      ]),
    ),
  );

  async function sendInvite(row: BetaSignupRow) {
    setState((current) => ({
      ...current,
      [row.id]: { ...current[row.id]!, error: null, pending: true },
    }));

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
        setState((current) => ({
          ...current,
          [row.id]: {
            ...current[row.id]!,
            error: payload?.message ?? "Could not send that invite.",
            pending: false,
          },
        }));
        return;
      }

      setState((current) => ({
        ...current,
        [row.id]: {
          error: null,
          // The server records the real timestamp; fall back to now only when
          // the send worked but the stamp did not.
          invitedAt: payload.invitedAt ?? new Date().toISOString(),
          pending: false,
        },
      }));
    } catch {
      setState((current) => ({
        ...current,
        [row.id]: {
          ...current[row.id]!,
          error: "Could not reach the server.",
          pending: false,
        },
      }));
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
              error: null,
              invitedAt: row.invitedAt,
              pending: false,
            };
            const sent = rowState.invitedAt !== null;

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
