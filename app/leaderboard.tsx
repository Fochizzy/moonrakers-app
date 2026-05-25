import React from "react";
import { Redirect } from "expo-router";

import { APP_ROUTES } from "@/utils/appRoutes";

export default function LeaderboardRedirectScreen() {
  return <Redirect href={APP_ROUTES.elo} />;
}
