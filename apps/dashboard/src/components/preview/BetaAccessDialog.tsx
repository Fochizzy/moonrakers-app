"use client";

import { useEffect, useRef, useState } from "react";

type Status =
  | { tone: "error"; text: string }
  | { tone: "success"; text: string }
  | null;

/**
 * The beta request form, opened from the hero and from the foot of every
 * preview section. A dialog rather than a route so a reader never loses the
 * section they were part-way through.
 */
export function BetaAccessDialog({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    // `showModal` is what puts the dialog in the top layer and traps focus;
    // rendering it `open` as an attribute would do neither.
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();

    setPending(true);
    setStatus(null);

    try {
      const response = await fetch("/api/beta-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        ok?: boolean;
      } | null;

      if (!response.ok || !payload?.ok) {
        setStatus({
          tone: "error",
          text: payload?.message ?? "Could not send that request. Try again.",
        });
        return;
      }

      setDone(true);
      setStatus({
        tone: "success",
        text: payload.message ?? "Request received.",
      });
      form.reset();
    } catch {
      setStatus({
        tone: "error",
        text: "Could not reach the server. Check your connection and try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      aria-labelledby="beta-access-title"
      className="beta-dialog"
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="beta-dialog__body">
        <div className="beta-dialog__head">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>
              Closed beta
            </p>
            <h2 className="beta-dialog__title" id="beta-access-title">
              Request beta access
            </h2>
          </div>
          <button
            aria-label="Close"
            className="beta-dialog__close"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="stack-md">
            <p className="beta-dialog__copy">{status?.text}</p>
            <p className="beta-dialog__copy">
              Check your inbox for a confirmation. Questions or bug reports go
              to{" "}
              <a
                className="term-link"
                href="mailto:info@moonrakersapp.org"
              >
                info@moonrakersapp.org
              </a>
              .
            </p>
            <button
              className="btn btn--primary"
              onClick={onClose}
              type="button"
            >
              Back to the preview
            </button>
          </div>
        ) : (
          <form className="beta-dialog__form" onSubmit={handleSubmit}>
            <p className="beta-dialog__copy">
              Moonraker&rsquo;s Analytics is in closed testing on Google Play.
              Give us the email address on your Google Play account and
              we&rsquo;ll add you to the tester list.
            </p>

            <label className="field">
              <span className="field__label">Google Play email address</span>
              <input
                aria-describedby="beta-access-hint"
                autoComplete="email"
                className="input"
                name="email"
                placeholder="you@gmail.com"
                required
                type="email"
              />
            </label>

            <p className="beta-dialog__hint" id="beta-access-hint">
              It has to be the address your Google Play account uses, or the
              invite will not reach you.
            </p>

            {status ? (
              <p
                className={
                  status.tone === "error" ? "notice notice--error" : "notice"
                }
                role={status.tone === "error" ? "alert" : "status"}
              >
                {status.text}
              </p>
            ) : null}

            <button
              className="btn btn--primary beta-dialog__submit"
              disabled={pending}
              type="submit"
            >
              {pending ? "Sending…" : "Request beta access"}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
