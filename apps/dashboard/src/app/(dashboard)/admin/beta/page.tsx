import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  BetaSignupList,
  type BetaSignupRow,
} from "@/components/admin/BetaSignupList";
import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCount } from "@/lib/formatNumber";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Beta signups · Moonraker’s Analytics",
  // An operator page with other people's addresses on it has no business in
  // anyone's search index.
  robots: { index: false, follow: false },
};

/**
 * The beta operator console. Not linked from the sidebar: it is reached by URL,
 * and `public.is_beta_admin()` decides whether the URL resolves at all.
 *
 * The 404 is presentation. The real barrier is RLS — a non-admin session
 * selects zero rows from `beta_access_requests` however it asks.
 */
export default async function BetaAdminPage() {
  const supabase = await createServerSupabaseClient();

  const { data: isAdmin } = await supabase.rpc("is_beta_admin");

  if (!isAdmin) {
    notFound();
  }

  const { data, error } = await supabase
    .from("beta_access_requests")
    .select("id, email, created_at, invited_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows: BetaSignupRow[] = (data ?? []).map((row) => ({
    createdAt: String(row.created_at),
    email: String(row.email),
    id: String(row.id),
    invitedAt: row.invited_at ? String(row.invited_at) : null,
  }));

  const invited = rows.filter((row) => row.invitedAt !== null).length;

  return (
    <section className="view-stack">
      <PageHeader
        copy="Everyone who has asked for beta access from the preview page. Sending an invite emails them the Google Play link."
        eyebrow="Admin"
        title="Beta signups"
      />

      <div className="stat-grid">
        <MetricCard
          detail="Requests received"
          label="Signed Up"
          value={formatCount(rows.length)}
        />
        <MetricCard
          accent="var(--gold)"
          detail="Play Store link sent"
          label="Invited"
          value={formatCount(invited)}
        />
        <MetricCard
          accent="var(--accent)"
          detail="Still to hear back"
          label="Waiting"
          value={formatCount(rows.length - invited)}
        />
      </div>

      <DashboardPanel padding="normal">
        <BetaSignupList rows={rows} />
      </DashboardPanel>
    </section>
  );
}
