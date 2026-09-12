-- v0.13.0: one personal weight-loss plan per profile.
create table if not exists weight_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references app_users(id),
  target_weight numeric not null check(target_weight > 0),
  pace text not null check(pace in ('gentle','normal','aggressive')),
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weight_goals_user_idx on weight_goals(user_id);
alter table weight_goals enable row level security;

drop trigger if exists weight_goals_updated_at on weight_goals;
create trigger weight_goals_updated_at before update on weight_goals for each row execute function set_updated_at();

drop policy if exists "weight goals by user" on weight_goals;
create policy "weight goals by user" on weight_goals for all
  using (user_id = pff_user_id() or pff_is_admin())
  with check (user_id = pff_user_id() or pff_is_admin());
