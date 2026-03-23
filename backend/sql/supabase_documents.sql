create extension if not exists pgcrypto;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  blob_name text not null,
  container_name text not null,
  blob_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_created_at_idx
  on public.documents (user_id, created_at desc);

alter table public.documents enable row level security;

drop policy if exists "Users can read own documents" on public.documents;
create policy "Users can read own documents"
  on public.documents
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own documents" on public.documents;
create policy "Users can insert own documents"
  on public.documents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own documents" on public.documents;
create policy "Users can delete own documents"
  on public.documents
  for delete
  to authenticated
  using (auth.uid() = user_id);
