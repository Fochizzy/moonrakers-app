import { redirect } from "next/navigation";

/** The app's `/leaderboard` route redirects to ELO; keep the web parity link alive. */
export default function LeaderboardPage() {
  redirect("/elo");
}
