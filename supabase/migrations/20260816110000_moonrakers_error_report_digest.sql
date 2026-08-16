-- client_error_reports is deliberately unreadable through the API, which means
-- nobody would ever look at it. This digest RPC gives the app owner a small
-- in-app window: counts plus the most recent distinct messages, no stacks.
-- Ownership is checked against the authenticated email so it survives profile
-- recreation.

create or replace function public.get_error_report_digest()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  result jsonb;
begin
  if viewer_email <> 'izzy.hodnett@gmail.com' then
    -- Not the owner: report nothing rather than erroring, so the client can
    -- simply hide the card.
    return jsonb_build_object('isOwner', false);
  end if;

  with recent as (
    select *
    from public.client_error_reports
    where created_at > now() - interval '30 days'
  )
  select jsonb_build_object(
    'isOwner', true,
    'generatedAt', now(),
    'total30d', (select count(*) from recent),
    'fatal30d', (select count(*) from recent where is_fatal),
    'last7d', (select count(*) from recent where created_at > now() - interval '7 days'),
    'latest', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'message', left(r.message, 200),
        'platform', r.platform,
        'appVersion', r.app_version,
        'isFatal', r.is_fatal,
        'count', r.occurrences,
        'lastSeen', r.last_seen
      ) order by r.last_seen desc)
      from (
        select
          message,
          platform,
          app_version,
          is_fatal,
          count(*) as occurrences,
          max(created_at) as last_seen
        from recent
        group by message, platform, app_version, is_fatal
        order by max(created_at) desc
        limit 5
      ) r),
      '[]'::jsonb
    )
  )
  into result;

  return result;
end;
$$;

revoke all on function public.get_error_report_digest() from public;
grant execute on function public.get_error_report_digest() to authenticated;
