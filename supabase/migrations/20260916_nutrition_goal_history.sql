-- v0.17.0: context for nutrition-goal changes without altering goal history.
alter table nutrition_goals add column if not exists reason text;
alter table nutrition_goals add column if not exists comment text;
alter table nutrition_goals add column if not exists created_by uuid references app_users(id);
