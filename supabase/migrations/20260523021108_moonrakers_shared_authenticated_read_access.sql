create policy "groups_select_authenticated"
on public.groups
for select
to authenticated
using (true);

create policy "games_select_authenticated"
on public.games
for select
to authenticated
using (true);

create policy "game_participants_select_authenticated"
on public.game_participants
for select
to authenticated
using (true);

create policy "game_rounds_select_authenticated"
on public.game_rounds
for select
to authenticated
using (true);

create policy "group_stats_rollups_select_authenticated"
on public.group_stats_rollups
for select
to authenticated
using (true);
