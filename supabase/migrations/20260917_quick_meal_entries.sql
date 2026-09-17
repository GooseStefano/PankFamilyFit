alter table meal_entries
  add column if not exists is_unresolved boolean not null default false,
  add column if not exists unresolved_name text,
  add column if not exists unresolved_note text,
  add column if not exists resolved_at timestamptz;

alter table meal_entries drop constraint if exists meal_entries_unresolved_valid;
alter table meal_entries add constraint meal_entries_unresolved_valid
  check (not is_unresolved or (food_item_id is null and length(trim(unresolved_name)) > 0));

create index if not exists meal_entries_unresolved_idx
  on meal_entries(user_id,date) where is_unresolved;

drop policy if exists "food admin write" on food_items;
drop policy if exists "food insert own or admin" on food_items;
drop policy if exists "food update own or admin" on food_items;
drop policy if exists "food delete own or admin" on food_items;
create policy "food insert own or admin" on food_items for insert
  with check (pff_is_admin() or created_by = pff_user_id());
create policy "food update own or admin" on food_items for update
  using (pff_is_admin() or created_by = pff_user_id())
  with check (pff_is_admin() or created_by = pff_user_id());
create policy "food delete own or admin" on food_items for delete
  using (pff_is_admin() or created_by = pff_user_id());

drop policy if exists "measures admin write" on food_measures;
drop policy if exists "measures insert own or admin" on food_measures;
drop policy if exists "measures update own or admin" on food_measures;
drop policy if exists "measures delete own or admin" on food_measures;
create policy "measures insert own or admin" on food_measures for insert
  with check (pff_is_admin() or exists (
    select 1 from food_items food
    where food.id = food_item_id and food.created_by = pff_user_id()
  ));
create policy "measures update own or admin" on food_measures for update
  using (pff_is_admin() or exists (
    select 1 from food_items food
    where food.id = food_item_id and food.created_by = pff_user_id()
  ))
  with check (pff_is_admin() or exists (
    select 1 from food_items food
    where food.id = food_item_id and food.created_by = pff_user_id()
  ));
create policy "measures delete own or admin" on food_measures for delete
  using (pff_is_admin() or exists (
    select 1 from food_items food
    where food.id = food_item_id and food.created_by = pff_user_id()
  ));

grant select, insert, update, delete on food_items, food_measures, meal_entries to authenticated;

notify pgrst, 'reload schema';
