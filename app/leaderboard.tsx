import React from "react";
import { Redirect } from "expo-router";

import { buildHomeRoute } from "@/utils/appRoutes";

export default function LeaderboardRedirectScreen() {
  return <Redirect href={buildHomeRoute("leaderboard")} />;
}
