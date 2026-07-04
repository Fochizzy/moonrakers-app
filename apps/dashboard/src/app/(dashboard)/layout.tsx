import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { requireDashboardAccess } from "@/lib/auth/serverAccess";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile } = await requireDashboardAccess();
  const profileName =
    profile?.player_name?.trim() ||
    profile?.display_name?.trim() ||
    "Commander";

  return (
    <div className="dashboard-shell">
      <div className="dashboard-sidebar-rail">
        <DashboardSidebar />
      </div>
      <div className="dashboard-main">
        <DashboardTopbar
          favoriteColor={profile?.favorite_color ?? null}
          profileName={profileName}
        />
        <main className="dashboard-main-slot">{children}</main>
      </div>
    </div>
  );
}
