
-- #3: client_game_id on games for save_completed_game idempotency
alter table public.games
  add column if not exists client_game_id uuid;

create unique index if not exists games_client_game_id_idx
  on public.games (client_game_id)
  where client_game_id is not null;

-- #4: Case-insensitive partial unique index on display_name (active profiles only).
-- Enforces uniqueness atomically under concurrency where the trigger alone cannot.
-- Also makes search_profiles_by_player_name ilike on display_name index-scannable.
create unique index if not exists profiles_display_name_unique_idx
  on public.profiles (lower(display_name))
  where deleted_at is null
    and display_name is not null
    and display_name <> '';
;
