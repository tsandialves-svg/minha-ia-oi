create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'monthly', 'yearly')),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  external_id text not null,
  plan text not null check (plan in ('monthly', 'yearly')),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
create index if not exists usage_user_created_idx
  on public.usage (user_id, created_at desc);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.usage enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
drop policy if exists "Users can manage their conversations" on public.conversations;
create policy "Users can manage their conversations"
  on public.conversations for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their messages" on public.messages;
create policy "Users can manage their messages"
  on public.messages for all to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can read their usage" on public.usage;
create policy "Users can read their usage"
  on public.usage for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can add their usage" on public.usage;
create policy "Users can add their usage"
  on public.usage for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their subscriptions" on public.subscriptions;
create policy "Users can read their subscriptions"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can add their subscriptions" on public.subscriptions;
create policy "Users can add their subscriptions"
  on public.subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant select on public.profiles to authenticated;
grant all on public.conversations to authenticated;
grant all on public.messages to authenticated;
grant select, insert on public.usage to authenticated;
grant select, insert on public.subscriptions to authenticated;
