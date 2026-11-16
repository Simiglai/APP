-- Pin search_path on trigger functions (Supabase security advisor: function_search_path_mutable).
alter function public.touch_updated_at() set search_path = public;
alter function public.days_sync() set search_path = public;
-- Only signed-in users may call the helper functions.
revoke execute on function public.coach_set_plan(uuid, text, text) from public, anon;
