import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { requireDashboardAccess } from "@/lib/auth/serverAccess";
import { resolvePlayerName } from "@/lib/playerName";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile, supabase, userId } = await requireDashboardAccess();
  // The topbar chip and the focus dropdown sit side by side, so they have to
  // resolve the same person to the same name.
  const profileName = resolvePlayerName(profile, "Commander");
  const { data: playerRows } = await supabase
    .from("profiles")
    .select("id, player_name, display_name");
  const playerOptions = (playerRows ?? [])
    .map((row) => ({
      id: String(row.id),
      label: resolvePlayerName(row),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return (
    <div className="dashboard-shell">
      <div className="dashboard-sidebar-rail">
        <DashboardSidebar />
      </div>
      <div className="dashboard-main">
        <DashboardTopbar
          favoriteColor={profile?.favorite_color ?? null}
          playerOptions={playerOptions}
          profileName={profileName}
          signedInPlayerId={userId}
        />
        <main className="dashboard-main-slot">{children}</main>
      </div>
    </div>
  );
}
