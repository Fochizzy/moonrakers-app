-- Send from the DKIM-signed subdomain rather than the bare domain.
--
-- Brevo has both verified, but only `auth.moonrakersapp.org` carries a domain
-- DKIM signature; `moonrakersapp.org` falls back to Brevo's shared "Default"
-- key. Without DKIM alignment to the From header, Gmail, Yahoo, and Microsoft
-- treat the mail as unauthenticated.

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
           'izzy.hodnett@gmail.com') into v_recipient;

  select coalesce(
           (select decrypted_secret from vault.decrypted_secrets where name = 'BETA_FROM_EMAIL' limit 1),
           'no-reply@auth.moonrakersapp.org') into v_sender;

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

-- The signup digest predates private.brevo_send and had its own copy of the
-- sender lookup; point it at the shared helper so there is one place to change.
create or replace function private.send_beta_access_digest()
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
           '<tr><td colspan="2" style="padding:14px;color:#7d8ca3;font-size:14px;">Nobody has signed up yet.</td></tr>'
         )
    into v_rows
  from public.beta_access_requests;

  v_body := format(
    '<p style="margin:0 0 16px 0;color:#94a3b8;font-size:15px;line-height:1.6;">%s on the list, %s added in the last seven days.</p>'
    '<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111a33;border:1px solid #1c2438;border-radius:12px;">%s</table>'
    '<p style="margin:18px 0 0 0;color:#7d8ca3;font-size:13px;line-height:1.6;">Anyone not yet in the tester group needs adding by hand at <a href="https://groups.google.com/g/moonrakers-beta/members" style="color:#2dd4bf;text-decoration:underline;">groups.google.com/g/moonrakers-beta</a>.</p>',
    v_total::text, v_new_week::text, v_rows);

  select coalesce(
           string_agg(format('%s  (%s)', email, to_char(created_at at time zone 'UTC', 'DD Mon YYYY')),
                      E'\n' order by created_at desc),
           'Nobody has signed up yet.')
    into v_text
  from public.beta_access_requests;

  v_request_id := private.brevo_send(
    format('Beta signups: %s on the list', v_total),
    private.moonrakers_email_shell('Weekly digest', 'Beta signups', v_body),
    format(E'Beta signups\n\n%s on the list, %s added in the last seven days.\n\n%s\n\nAdd anyone missing at https://groups.google.com/g/moonrakers-beta/members',
           v_total, v_new_week, v_text),
    'beta-access-digest'
  );

  if v_request_id is null then
    return 'skipped: BREVO_API_KEY not in vault';
  end if;

  return format('queued net request %s (%s addresses)', v_request_id, v_total);
end;
$$;

revoke all on function private.send_beta_access_digest() from public, anon, authenticated;
