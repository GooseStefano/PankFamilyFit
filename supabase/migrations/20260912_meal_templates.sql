-- v0.15.0: shared meal templates. Apply this migration in Supabase SQL Editor.
create table if not exists meal_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) > 0),
  meal_type text not null check(meal_type in ('breakfast','lunch','dinner','snack')),
  created_by uuid not null references app_users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meal_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references meal_templates(id) on delete cascade,
  food_item_id uuid references food_items(id),
  food_name text not null,
  amount numeric not null check(amount > 0),
  unit_label text not null,
  calories numeric not null,
  protein numeric not null,
  fat numeric not null,
  carbs numeric not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_template_items_template_idx on meal_template_items(template_id, order_index);
alter table meal_templates enable row level security;
alter table meal_template_items enable row level security;

drop policy if exists "templates read active" on meal_templates;
drop policy if exists "templates admin write" on meal_templates;
drop policy if exists "template items read active" on meal_template_items;
drop policy if exists "template items admin write" on meal_template_items;
create policy "templates read active" on meal_templates for select using (is_active or pff_is_admin());
create policy "templates admin write" on meal_templates for all using (pff_is_admin()) with check (pff_is_admin());
create policy "template items read active" on meal_template_items for select using (exists (select 1 from meal_templates template where template.id = meal_template_items.template_id and (template.is_active or pff_is_admin())));
create policy "template items admin write" on meal_template_items for all using (pff_is_admin()) with check (pff_is_admin());

drop trigger if exists meal_templates_updated_at on meal_templates;
create trigger meal_templates_updated_at before update on meal_templates for each row execute function set_updated_at();
drop trigger if exists meal_template_items_updated_at on meal_template_items;
create trigger meal_template_items_updated_at before update on meal_template_items for each row execute function set_updated_at();
