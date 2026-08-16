-- Notifications go to info@moonrakersapp.org rather than a personal address.
--
-- Only the *contact* address moves. `private.beta_admins` still holds
-- izzy.hodnett@gmail.com because that is a login identity matched against
-- auth.jwt(), not a mailbox — changing it would lock the admin console.

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
      'replyTo', jsonb_build_object('email', 'info@moonrakersapp.org'),
      'subject', p_subject,
      'htmlContent', p_html,
      'textContent', p_text,
      'tags', jsonb_build_array(p_tag)
    ),
    timeout_milliseconds := 15000
  );
end;
$$;

revoke all on function private.brevo_send(text, text, text, text) from public, anon, authenticated;
