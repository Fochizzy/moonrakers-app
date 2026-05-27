const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationSource = fs.readFileSync(
  path.join(
    projectRoot,
    "supabase",
    "migrations",
    "20260527173443_moonrakers_restore_chart_rpc_contracts.sql",
  ),
  "utf8",
);

assert.match(
  migrationSource,
  /fallback_replay jsonb := '\[\]'::jsonb;/,
  "expected the restore chart RPC migration to allocate a server-authored replay fallback payload",
);

assert.match(
  migrationSource,
  /fallback_replay_players jsonb := '\[\]'::jsonb;/,
  "expected the restore chart RPC migration to allocate replay player rows alongside replay snapshots",
);

assert.match(
  migrationSource,
  /from public\.game_rounds as gr[\s\S]*assist_prestige_recipients[\s\S]*jsonb_each_text\(gr\.assist_recipients\)/i,
  "expected the replay fallback to rebuild replay rounds from stored Supabase game_rounds instead of leaving replay empty",
);

assert.doesNotMatch(
  migrationSource,
  /public\.can_read_game\s*\(/i,
  "expected the replay fallback to avoid depending on can_read_game so the live chart RPC works on projects missing that helper",
);

assert.match(
  migrationSource,
  /when normalized_chart_key = 'replay_chart' then jsonb_build_object\([\s\S]*jsonb_typeof\(effective_data->'replay'\) = 'array' and jsonb_array_length\(effective_data->'replay'\) > 0[\s\S]*else fallback_replay[\s\S]*jsonb_typeof\(effective_data->'players'\) = 'array' and jsonb_array_length\(effective_data->'players'\) > 0[\s\S]*else fallback_replay_players/i,
  "expected the replay chart branch to publish server-authored fallback replay and player data when the cached chart payload is thin",
);

assert.match(
  migrationSource,
  /effective_data := effective_data \|\| jsonb_build_object\('meta', effective_meta\);/i,
  "expected chart-specific dataset shaping to preserve effective_meta so non-point charts still report hasData correctly",
);

console.log("chart-replay-rpc-contract.test.cjs passed");
