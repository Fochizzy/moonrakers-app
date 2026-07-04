import { HomeView } from "@/components/home/HomeView";
import { loadDashboardHome } from "@/lib/data/loadDashboardHome";

export default async function DashboardHomePage() {
  const { payload, profile } = await loadDashboardHome();
  const profileName =
    profile?.display_name?.trim() ||
    profile?.player_name?.trim() ||
    "Commander";

  return <HomeView profileName={profileName} payload={payload} />;
}
