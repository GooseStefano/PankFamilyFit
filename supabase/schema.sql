create extension if not exists pgcrypto;

create table app_users (id uuid primary key default gen_random_uuid(), name text not null unique, role text not null check (role in ('admin','member')), created_at timestamptz not null default now());
create table pin_access (id uuid primary key default gen_random_uuid(), user_id uuid not null references app_users on delete cascade, pin_hash text not null, role text not null, is_active boolean not null default true);
create table nutrition_goals (id uuid primary key default gen_random_uuid(), user_id uuid not null references app_users, start_date date not null, calories numeric not null, protein numeric not null, fat numeric not null, carbs numeric not null, created_at timestamptz not null default now(), unique(user_id,start_date));
create table food_items (id uuid primary key default gen_random_uuid(), name text not null, type text not null check(type in ('product','dish')), source_type text not null default 'manual' check(source_type in ('manual','recipe')), category text not null, base_unit text not null, base_amount numeric not null check(base_amount>0), cooked_weight numeric check(cooked_weight>0), calories numeric not null, protein numeric not null, fat numeric not null, carbs numeric not null, is_favorite boolean not null default false, created_by uuid references app_users, is_archived boolean not null default false, usage_count integer not null default 0, recipe_version integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table food_measures (id uuid primary key default gen_random_uuid(), food_item_id uuid not null references food_items on delete cascade, label text not null, unit text not null, amount_in_base_unit numeric not null check(amount_in_base_unit>0), created_at timestamptz not null default now());
create table recipe_ingredients (id uuid primary key default gen_random_uuid(), recipe_food_item_id uuid not null references food_items on delete cascade, ingredient_food_item_id uuid not null references food_items, amount numeric not null check(amount>0), unit_label text not null, calories_snapshot numeric not null, protein_snapshot numeric not null, fat_snapshot numeric not null, carbs_snapshot numeric not null, created_at timestamptz not null default now());
create table meal_entries (id uuid primary key default gen_random_uuid(), user_id uuid not null references app_users, date date not null, meal_type text not null check(meal_type in ('breakfast','lunch','dinner','snack')), food_item_id uuid references food_items, food_name_snapshot text not null, amount numeric not null check(amount>0), unit_label text not null, calories_snapshot numeric not null, protein_snapshot numeric not null, fat_snapshot numeric not null, carbs_snapshot numeric not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table daily_notes (id uuid primary key default gen_random_uuid(), user_id uuid not null references app_users, date date not null, text text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,date));
create table weight_entries (id uuid primary key default gen_random_uuid(), user_id uuid not null references app_users(id), date date not null, weight numeric not null check(weight>0), note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,date));
create table workout_sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references app_users(id) on delete cascade, date date not null, week_type text not null check(week_type in ('A','B')), muscle_group text not null check(muscle_group in ('chest_triceps','back_biceps','legs_shoulders')), wellbeing_score integer check(wellbeing_score between 1 and 10), note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,date));
create table exercise_library (id uuid primary key default gen_random_uuid(), name text not null, default_muscle_group text not null check(default_muscle_group in ('chest_triceps','back_biceps','legs_shoulders')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), is_archived boolean not null default false);
create unique index exercise_library_active_name_idx on exercise_library(lower(name)) where is_archived = false;
create table workout_exercises (id uuid primary key default gen_random_uuid(), workout_session_id uuid not null references workout_sessions(id) on delete cascade, exercise_library_id uuid references exercise_library(id), name_snapshot text not null, planned_sets integer not null check(planned_sets between 1 and 20), rep_min integer not null check(rep_min > 0), rep_max integer not null check(rep_max >= rep_min), planned_weight numeric check(planned_weight >= 0), plan_comment text not null default '', order_index integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table workout_sets (id uuid primary key default gen_random_uuid(), workout_exercise_id uuid not null references workout_exercises(id) on delete cascade, set_number integer not null check(set_number > 0), weight numeric check(weight >= 0), reps integer check(reps >= 0), difficulty integer check(difficulty between 1 and 10), comment text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workout_exercise_id,set_number));
create index meal_entries_user_date_idx on meal_entries(user_id,date);
create index nutrition_goals_user_date_idx on nutrition_goals(user_id,start_date desc);
create index weight_entries_user_date_idx on weight_entries(user_id,date desc);
create index recipe_ingredients_recipe_idx on recipe_ingredients(recipe_food_item_id);
create index workout_sessions_lookup_idx on workout_sessions(user_id,week_type,muscle_group,date desc);
create index workout_exercises_session_idx on workout_exercises(workout_session_id,order_index);
create index workout_sets_exercise_idx on workout_sets(workout_exercise_id,set_number);

insert into app_users (id,name,role) values ('00000000-0000-0000-0000-000000000001','Даня','admin'),('00000000-0000-0000-0000-000000000002','Вика','member');
insert into pin_access (user_id,pin_hash,role) values ('00000000-0000-0000-0000-000000000001','e95995d6e3f243779d317d32627e4a97c03ee94d95b9b91567133cb249d97b5c','admin'),('00000000-0000-0000-0000-000000000002','db49d04d733d3da455dff99d7f3e07b766043ef16056f24768bf719fa6f8c394','member');
insert into nutrition_goals(user_id,start_date,calories,protein,fat,carbs) values ('00000000-0000-0000-0000-000000000001','2026-09-08',2200,160,70,230),('00000000-0000-0000-0000-000000000002','2026-09-08',1600,110,50,160);

alter table app_users enable row level security;
alter table pin_access enable row level security;
alter table nutrition_goals enable row level security;
alter table food_items enable row level security;
alter table food_measures enable row level security;
alter table recipe_ingredients enable row level security;
alter table meal_entries enable row level security;
alter table daily_notes enable row level security;
alter table weight_entries enable row level security;
alter table workout_sessions enable row level security;
alter table exercise_library enable row level security;
alter table workout_exercises enable row level security;
alter table workout_sets enable row level security;

-- В production прямой доступ anon должен оставаться закрытым.
-- PIN-проверку и CRUD выполняйте через Edge Function, которая выдаёт короткоживущий JWT
-- с user_id/role; затем добавьте RLS-политики по этим claims.
