-- v0.18.0: lightweight shared habit checklist.
create table if not exists habit_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) > 0),
  visibility text not null check(visibility in ('danya','vika','both')),
  weekdays jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid not null references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_item_id uuid not null references habit_items(id) on delete cascade,
  user_id uuid not null references app_users(id),
  date date not null,
  created_at timestamptz not null default now(),
  unique(habit_item_id, user_id, date)
);
create index if not exists habit_completions_user_date_idx on habit_completions(user_id, date desc);
alter table habit_items enable row level security;
alter table habit_completions enable row level security;
drop policy if exists "habits read assigned" on habit_items;
drop policy if exists "habits admin write" on habit_items;
drop policy if exists "habit completions own" on habit_completions;
create policy "habits read assigned" on habit_items for select using (pff_is_admin() or visibility = 'both' or (visibility = 'vika' and pff_user_id() = '00000000-0000-0000-0000-000000000002'));
create policy "habits admin write" on habit_items for all using (pff_is_admin()) with check (pff_is_admin());
create policy "habit completions own" on habit_completions for all using (pff_is_admin() or user_id = pff_user_id()) with check (pff_is_admin() or (user_id = pff_user_id() and exists (select 1 from habit_items habit where habit.id = habit_completions.habit_item_id and (habit.visibility = 'both' or (habit.visibility = 'vika' and pff_user_id() = '00000000-0000-0000-0000-000000000002')))));
drop trigger if exists habit_items_updated_at on habit_items;
create trigger habit_items_updated_at before update on habit_items for each row execute function set_updated_at();
