import React from "react";
import { Redirect } from "expo-router";

import { APP_ROUTES } from "@/utils/appRoutes";

export default function ManagePlayersGroupsScreen() {
  return <Redirect href={APP_ROUTES.roster} />;
}
