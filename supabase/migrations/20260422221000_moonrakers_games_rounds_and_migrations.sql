create table public.games (
  id uuid primary key default gen_random_uuid(),
  host_profile_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  group_name_snapshot text,
  status text not null default 'finished',
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  winner_profile_id uuid references public.profiles(id) on delete set null
);

create table public.game_participants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  player_name_snapshot text not null,
  display_name_snapshot text,
  color_snapshot text,
  assigned_card_art_index_snapshot int,
  start_order int not null,
  total_prestige numeric not null default 0,
  direct_prestige numeric not null default 0,
  assist_prestige_received numeric not null default 0,
  objective_prestige numeric not null default 0,
  score numeric not null default 0,
  assists int not null default 0,
  failures int not null default 0,
  contracts int not null default 0,
  is_winner boolean not null default false
);

create unique index game_participants_unique_profile_per_game
  on public.game_participants (game_id, profile_id)
  where profile_id is not null;

create unique index game_participants_unique_start_order_per_game
  on public.game_participants (game_id, start_order);

create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  participant_id uuid not null references public.game_participants(id) on delete cascade,
  round_index int not null,
  prestige numeric not null default 0,
  contracts int not null default 0,
  failures int not null default 0,
  assist_recipients jsonb not null default '{}'::jsonb,
  assist_prestige_recipients jsonb not null default '{}'::jsonb,
  objective_count int not null default 0,
  objective_prestige numeric not null default 0,
  created_at timestamptz not null default now()
);

create unique index game_rounds_unique_participant_round
  on public.game_rounds (game_id, participant_id, round_index);

create table public.profile_migrations (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  last_error text,
  local_players_count int not null default 0,
  local_groups_count int not null default 0,
  local_games_count int not null default 0,
  migration_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.can_read_game(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.games
    where public.games.id = target_game_id
      and (
        public.games.host_profile_id = (select auth.uid())
        or exists (
          select 1
          from public.game_participants
          where public.game_participants.game_id = public.games.id
            and public.game_participants.profile_id = (select auth.uid())
        )
      )
  )
$$;

create or replace function public.can_manage_game(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.games
    where public.games.id = target_game_id
      and public.games.host_profile_id = (select auth.uid())
  )
$$;

alter table public.games enable row level security;
alter table public.game_participants enable row level security;
alter table public.game_rounds enable row level security;
alter table public.profile_migrations enable row level security;

create policy "games_select_participants"
on public.games
for select
to authenticated
using (public.can_read_game(id));

create policy "games_insert_host"
on public.games
for insert
to authenticated
with check ((select auth.uid()) = host_profile_id);

create policy "game_participants_select_participants"
on public.game_participants
for select
to authenticated
using (public.can_read_game(game_id));

create policy "game_participants_insert_host"
on public.game_participants
for insert
to authenticated
with check (public.can_manage_game(game_id));

create policy "game_rounds_select_participants"
on public.game_rounds
for select
to authenticated
using (public.can_read_game(game_id));

create policy "game_rounds_insert_host"
on public.game_rounds
for insert
to authenticated
with check (public.can_manage_game(game_id));

create policy "profile_migrations_manage_self"
on public.profile_migrations
for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));;
