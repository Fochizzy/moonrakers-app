-- Capture beta access requests from the signed-out preview.
--
-- The preview at /preview is public, so a request arrives with no session and
-- no profile to hang it off. The row is the durable record: the notification
-- emails that follow are best-effort, and a Brevo outage must not lose someone
-- who asked to be let in.
--
-- Insert is open to anon on purpose — that is the whole point of the form — but
-- there is deliberately no select/update/delete policy, so the address list is
-- readable only through the service role (SQL editor, server-side jobs). An
-- anonymous visitor can add their own address and learn nothing about anyone
-- else's.

create table if not exists public.beta_access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Which surface the request came from, so a second entry point stays
  -- distinguishable without another migration.
  source text not null default 'preview',
  created_at timestamptz not null default now(),
  -- Deliberately no delivery column: the request arrives with anon privileges,
  -- which are insert-only, so anything stamped afterwards would silently no-op.
  -- Brevo's own dashboard is the record of what was delivered.
  constraint beta_access_requests_email_shape check (
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and length(email) <= 254
  )
);

-- Case-insensitive: Google treats the local part as case-insensitive in
-- practice, and a duplicate row would mean a second thank-you email.
create unique index if not exists beta_access_requests_email_key
  on public.beta_access_requests (lower(email));

create index if not exists beta_access_requests_created_at_idx
  on public.beta_access_requests (created_at desc);

alter table public.beta_access_requests enable row level security;

drop policy if exists "beta_access_requests_insert_public" on public.beta_access_requests;
create policy "beta_access_requests_insert_public"
  on public.beta_access_requests
  for insert
  to anon, authenticated
  with check (true);

grant insert on public.beta_access_requests to anon, authenticated;
