create or replace function public.enforce_unique_profile_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_new_display_name text;
  normalized_old_display_name text;
begin
  normalized_new_display_name := nullif(btrim(coalesce(new.display_name, '')), '');

  if normalized_new_display_name is null then
    new.display_name := null;
    return new;
  end if;

  new.display_name := normalized_new_display_name;

  if tg_op = 'UPDATE' then
    normalized_old_display_name := nullif(btrim(coalesce(old.display_name, '')), '');

    if normalized_old_display_name is not null
      and lower(normalized_old_display_name) = lower(normalized_new_display_name) then
      return new;
    end if;
  end if;

  if exists (
    select 1
    from public.profiles
    where public.profiles.id <> new.id
      and public.profiles.deleted_at is null
      and nullif(btrim(coalesce(public.profiles.display_name, '')), '') is not null
      and lower(btrim(public.profiles.display_name)) = lower(normalized_new_display_name)
  ) then
    raise exception using
      errcode = '23505',
      message = 'duplicate key value violates unique constraint',
      detail = format('Key (display_name)=(%s) already exists.', normalized_new_display_name);
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_unique_display_name on public.profiles;

create trigger profiles_enforce_unique_display_name
before insert or update on public.profiles
for each row
execute function public.enforce_unique_profile_display_name();
