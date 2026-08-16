-- In-app bug reports, mailed out as they arrive and again as a Friday digest.
--
-- The send lives in a trigger rather than in the app so a report is never lost
-- to a failed fetch on a phone with bad signal: once the row commits, pg_net
-- owns delivery. pg_net queues the request, so the insert does not wait on
-- Brevo either.

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  -- Snapshotted, so a later rename does not rewrite who reported what.
  reporter_name text not null,
  description text not null,
  app_version text,
  platform text,
  created_at timestamptz not null default now(),
  constraint bug_reports_description_length check (
    length(btrim(description)) between 1 and 4000
  )
);

create index if not exists bug_reports_created_at_idx
  on public.bug_reports (created_at desc);

alter table public.bug_reports enable row level security;

-- A signed-in player may file a report as themselves and nothing else.
drop policy if exists "bug_reports_insert_self" on public.bug_reports;
create policy "bug_reports_insert_self"
  on public.bug_reports
  for insert
  to authenticated
  with check (profile_id = auth.uid());

-- Only the beta admin reads them back; reporters do not get a list of everyone
-- else's reports.
drop policy if exists "bug_reports_select_admin" on public.bug_reports;
create policy "bug_reports_select_admin"
  on public.bug_reports
  for select
  to authenticated
  using (private.is_beta_admin());

grant insert, select on public.bug_reports to authenticated;

-- --------------------------------------------------------------- mail out --

create or replace function private.brevo_send(
  p_subject text,
  p_html text,
  p_text text,
  p_tag text
)
returns bigint
language plpgsql
security definer
set search_path = public, private, vault, net
as $$
declare
  v_api_key   text;
  v_recipient text;
  v_sender    text;
begin
  select decrypted_secret into v_api_key
  from vault.decrypted_secrets where name = 'BREVO_API_KEY' limit 1;

  if v_api_key is null or length(btrim(v_api_key)) = 0 then
    return null;
  end if;

  select coalesce(
           (select decrypted_secret from vault.decrypted_secrets where name = 'BETA_NOTIFY_TO' limit 1),
           'info@moonrakersapp.org') into v_recipient;

  select coalesce(
           (select decrypted_secret from vault.decrypted_secrets where name = 'BETA_FROM_EMAIL' limit 1),
           'info@moonrakersapp.org') into v_sender;

  return net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object(
      'accept', 'application/json',
      'api-key', v_api_key,
      'content-type', 'application/json'
    ),
    body := jsonb_build_object(
      'sender', jsonb_build_object('email', v_sender, 'name', 'Moonrakers Command'),
      'to', jsonb_build_array(jsonb_build_object('email', v_recipient)),
      'subject', p_subject,
      'htmlContent', p_html,
      'textContent', p_text,
      'tags', jsonb_build_array(p_tag)
    ),
    timeout_milliseconds := 15000
  );
end;
$$;

-- The app's palette and type stack, written as literals: mail clients resolve
-- neither CSS variables nor external stylesheets.
create or replace function private.moonrakers_email_shell(
  p_eyebrow text,
  p_heading text,
  p_body_html text
)
returns text
language sql
immutable
as $$
  select format($html$<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>%s</title></head>
<body style="margin:0;padding:0;background-color:#040814;color:#e2e8f0;font-family:&quot;Segoe UI&quot;, &quot;Helvetica Neue&quot;, Arial, sans-serif;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#040814;padding:32px 16px;"><tr><td align="center">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#0c1226;border:1px solid #1c2438;border-radius:16px;">
    <tr><td style="padding:28px 28px 8px 28px;">
      <p style="margin:0 0 6px 0;color:#2dd4bf;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">%s</p>
      <h1 style="margin:0;color:#f8fbff;font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">%s</h1>
    </td></tr>
    <tr><td style="padding:8px 28px 28px 28px;">%s</td></tr>
  </table>
</td></tr></table>
</body></html>$html$,
    private.html_escape(p_heading),
    private.html_escape(p_eyebrow),
    private.html_escape(p_heading),
    p_body_html)
$$;

create or replace function private.notify_bug_report()
returns trigger
language plpgsql
security definer
set search_path = public, private, vault, net
as $$
declare
  v_body text;
begin
  v_body := format(
    '<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111a33;border:1px solid #1c2438;border-radius:12px;margin:0 0 16px 0;"><tr><td style="padding:14px 16px;">'
    '<p style="margin:0 0 4px 0;color:#7d8ca3;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Reported by</p>'
    '<p style="margin:0;color:#f8fbff;font-size:16px;font-weight:700;">%s</p></td></tr></table>'
    '<p style="margin:0 0 8px 0;color:#7d8ca3;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">What they said</p>'
    '<p style="margin:0 0 16px 0;color:#e2e8f0;font-size:15px;line-height:1.6;white-space:pre-wrap;">%s</p>'
    '<p style="margin:0;color:#7d8ca3;font-size:13px;line-height:1.5;">%s%s</p>',
    private.html_escape(new.reporter_name),
    private.html_escape(new.description),
    coalesce('Platform: ' || private.html_escape(new.platform), 'Platform: unknown'),
    coalesce(' · App version: ' || private.html_escape(new.app_version), '')
  );

  perform private.brevo_send(
    format('Bug report from %s', new.reporter_name),
    private.moonrakers_email_shell('Bug report', 'A new bug report', v_body),
    format(E'Bug report from %s\n\n%s\n\nPlatform: %s\nApp version: %s',
           new.reporter_name, new.description,
           coalesce(new.platform, 'unknown'), coalesce(new.app_version, 'unknown')),
    'bug-report'
  );

  return new;
end;
$$;

drop trigger if exists bug_reports_notify on public.bug_reports;
create trigger bug_reports_notify
  after insert on public.bug_reports
  for each row
  execute function private.notify_bug_report();

-- ------------------------------------------------------------- weekly sum --

create or replace function private.send_bug_report_digest()
returns text
language plpgsql
security definer
set search_path = public, private, vault, net
as $$
declare
  v_total      integer;
  v_new_week   integer;
  v_rows       text;
  v_body       text;
  v_text       text;
  v_request_id bigint;
begin
  select count(*), count(*) filter (where created_at >= now() - interval '7 days')
    into v_total, v_new_week
  from public.bug_reports;

  select coalesce(
           string_agg(
             format(
               '<tr><td style="padding:12px 14px;border-top:1px solid #1c2438;">'
               '<p style="margin:0 0 2px 0;color:#f8fbff;font-size:14px;font-weight:700;">%s</p>'
               '<p style="margin:0 0 6px 0;color:#7d8ca3;font-size:12px;">%s</p>'
               '<p style="margin:0;color:#e2e8f0;font-size:14px;line-height:1.55;white-space:pre-wrap;">%s</p>'
               '</td></tr>',
               private.html_escape(reporter_name),
               to_char(created_at at time zone 'UTC', 'DD Mon YYYY HH24:MI'),
               private.html_escape(description)
             ),
             '' order by created_at desc
           ),
           '<tr><td style="padding:14px;color:#7d8ca3;font-size:14px;">No bugs reported yet.</td></tr>'
         )
    into v_rows
  from public.bug_reports;

  v_body := format(
    '<p style="margin:0 0 16px 0;color:#94a3b8;font-size:15px;line-height:1.6;">%s reports in total, %s in the last seven days.</p>'
    '<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111a33;border:1px solid #1c2438;border-radius:12px;">%s</table>',
    v_total::text, v_new_week::text, v_rows);

  select coalesce(
           string_agg(format(E'%s — %s\n%s', reporter_name,
                             to_char(created_at at time zone 'UTC', 'DD Mon YYYY HH24:MI'),
                             description),
                      E'\n\n' order by created_at desc),
           'No bugs reported yet.')
    into v_text
  from public.bug_reports;

  v_request_id := private.brevo_send(
    format('Bug reports: %s in the last week', v_new_week),
    private.moonrakers_email_shell('Weekly digest', 'Bug reports', v_body),
    format(E'Bug reports\n\n%s reports in total, %s in the last seven days.\n\n%s',
           v_total, v_new_week, v_text),
    'bug-report-digest'
  );

  if v_request_id is null then
    return 'skipped: BREVO_API_KEY not in vault';
  end if;

  return format('queued net request %s (%s reports)', v_request_id, v_total);
end;
$$;

revoke all on function private.send_bug_report_digest() from public, anon, authenticated;
revoke all on function private.brevo_send(text, text, text, text) from public, anon, authenticated;
