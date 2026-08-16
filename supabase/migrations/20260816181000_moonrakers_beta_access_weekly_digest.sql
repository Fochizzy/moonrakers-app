-- Email Izzy the full beta signup list every Friday.
--
-- Run from Postgres rather than the Worker on purpose: the digest reads the
-- whole table, and the web app only ever holds anon privileges, which are
-- insert-only by design. Doing it here means no service-role key has to live in
-- a Worker secret just so a weekly email can run.
--
-- Brevo is the same transport the app's other mail goes through. The key is
-- read from Vault, so it is never written into a migration or a cron argument.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Addresses pass a shape check on insert, but that check still permits '<',
-- so escape before building any markup out of them.
create or replace function private.html_escape(value text)
returns text
language sql
immutable
as $$
  select replace(
           replace(
             replace(
               replace(coalesce(value, ''), '&', '&amp;'),
               '<', '&lt;'),
             '>', '&gt;'),
           '"', '&quot;')
$$;

create or replace function private.send_beta_access_digest()
returns text
language plpgsql
security definer
set search_path = public, private, vault, net
as $$
declare
  v_api_key    text;
  v_recipient  text;
  v_sender     text;
  v_total      integer;
  v_new_week   integer;
  v_rows       text;
  v_html       text;
  v_text       text;
  v_request_id bigint;
begin
  select decrypted_secret into v_api_key
  from vault.decrypted_secrets
  where name = 'BREVO_API_KEY'
  limit 1;

  -- No key yet means the digest is not configured. Returning quietly keeps a
  -- half-set-up project from filling cron.job_run_details with failures.
  if v_api_key is null or length(btrim(v_api_key)) = 0 then
    return 'skipped: BREVO_API_KEY not in vault';
  end if;

  select coalesce(
           (select decrypted_secret from vault.decrypted_secrets where name = 'BETA_NOTIFY_TO' limit 1),
           'info@moonrakersapp.org')
    into v_recipient;

  select coalesce(
           (select decrypted_secret from vault.decrypted_secrets where name = 'BETA_FROM_EMAIL' limit 1),
           'info@moonrakersapp.org')
    into v_sender;

  select count(*),
         count(*) filter (where created_at >= now() - interval '7 days')
    into v_total, v_new_week
  from public.beta_access_requests;

  select coalesce(
           string_agg(
             format(
               '<tr><td style="padding:10px 14px;border-top:1px solid #1c2438;color:#f8fbff;font-size:14px;word-break:break-all;">%s</td>'
               '<td style="padding:10px 14px;border-top:1px solid #1c2438;color:#7d8ca3;font-size:13px;white-space:nowrap;" align="right">%s</td></tr>',
               private.html_escape(email),
               to_char(created_at at time zone 'UTC', 'DD Mon YYYY')
             ),
             '' order by created_at desc
           ),
           format(
             '<tr><td colspan="2" style="padding:14px;color:#7d8ca3;font-size:14px;">%s</td></tr>',
             'Nobody has signed up yet.'
           )
         )
    into v_rows
  from public.beta_access_requests;

  -- Same palette and type stack as globals.css, written as literals because
  -- mail clients resolve neither CSS variables nor external stylesheets.
  v_html := format($html$<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>Beta signups</title></head>
<body style="margin:0;padding:0;background-color:#040814;color:#e2e8f0;font-family:&quot;Segoe UI&quot;, &quot;Helvetica Neue&quot;, Arial, sans-serif;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#040814;padding:32px 16px;"><tr><td align="center">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#0c1226;border:1px solid #1c2438;border-radius:16px;">
    <tr><td style="padding:28px 28px 8px 28px;">
      <p style="margin:0 0 6px 0;color:#2dd4bf;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Weekly digest</p>
      <h1 style="margin:0;color:#f8fbff;font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">Beta signups</h1>
    </td></tr>
    <tr><td style="padding:8px 28px 4px 28px;">
      <p style="margin:0 0 16px 0;color:#94a3b8;font-size:15px;line-height:1.6;">%s on the list, %s added in the last seven days.</p>
      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111a33;border:1px solid #1c2438;border-radius:12px;">%s</table>
    </td></tr>
    <tr><td style="padding:18px 28px 28px 28px;">
      <p style="margin:0;color:#7d8ca3;font-size:13px;line-height:1.6;">Anyone not yet in the tester group needs adding by hand at <a href="https://groups.google.com/g/moonrakers-beta/members" style="color:#2dd4bf;text-decoration:underline;">groups.google.com/g/moonrakers-beta</a>.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>$html$, v_total::text, v_new_week::text, v_rows);

  select coalesce(
           string_agg(format('%s  (%s)', email, to_char(created_at at time zone 'UTC', 'DD Mon YYYY')),
                      E'\n' order by created_at desc),
           'Nobody has signed up yet.')
    into v_text
  from public.beta_access_requests;

  v_text := format(
    E'Beta signups\n\n%s on the list, %s added in the last seven days.\n\n%s\n\nAdd anyone missing at https://groups.google.com/g/moonrakers-beta/members',
    v_total, v_new_week, v_text);

  select net.http_post(
           url := 'https://api.brevo.com/v3/smtp/email',
           headers := jsonb_build_object(
             'accept', 'application/json',
             'api-key', v_api_key,
             'content-type', 'application/json'
           ),
           body := jsonb_build_object(
             'sender', jsonb_build_object('email', v_sender, 'name', 'Moonrakers Command'),
             'to', jsonb_build_array(jsonb_build_object('email', v_recipient)),
             'subject', format('Beta signups: %s on the list', v_total),
             'htmlContent', v_html,
             'textContent', v_text,
             'tags', jsonb_build_array('beta-access-digest')
           ),
           timeout_milliseconds := 15000
         )
    into v_request_id;

  return format('queued net request %s to %s (%s addresses)', v_request_id, v_recipient, v_total);
end;
$$;

revoke all on function private.send_beta_access_digest() from public, anon, authenticated;

-- Friday 16:00 UTC. pg_cron runs on UTC, so this is late afternoon in the UK
-- and mid-morning on the US west coast.
select cron.unschedule('beta-access-weekly-digest')
where exists (select 1 from cron.job where jobname = 'beta-access-weekly-digest');

select cron.schedule(
  'beta-access-weekly-digest',
  '0 16 * * 5',
  $cron$select private.send_beta_access_digest()$cron$
);
