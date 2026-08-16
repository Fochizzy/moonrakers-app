import { buildHistoryRows } from "../history/historyRows";
import { loadGameArchive } from "./loadGameArchive";

export async function loadHistoryScreen() {
  const archive = await loadGameArchive();

  return {
    rows: buildHistoryRows(archive.games, archive.profileId),
  };
}
