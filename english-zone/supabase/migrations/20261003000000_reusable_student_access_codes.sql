create or replace function public.verify_student_access_code(p_code_hash text, p_client_hash text)
returns table(student_email text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_attempt public.access_code_attempts%rowtype;
begin
  if p_code_hash is null or length(p_code_hash) <> 64 or p_client_hash is null or length(p_client_hash) <> 64 then
    return;
  end if;

  insert into public.access_code_attempts (client_hash, attempts, window_started_at)
  values (p_client_hash, 1, now())
  on conflict (client_hash) do update set
    attempts = case
      when public.access_code_attempts.window_started_at < now() - interval '15 minutes'
        or (public.access_code_attempts.locked_until is not null and public.access_code_attempts.locked_until <= now()) then 1
      else public.access_code_attempts.attempts + 1
    end,
    window_started_at = case
      when public.access_code_attempts.window_started_at < now() - interval '15 minutes'
        or (public.access_code_attempts.locked_until is not null and public.access_code_attempts.locked_until <= now()) then now()
      else public.access_code_attempts.window_started_at
    end,
    locked_until = case
      when public.access_code_attempts.window_started_at < now() - interval '15 minutes'
        or (public.access_code_attempts.locked_until is not null and public.access_code_attempts.locked_until <= now()) then null
      when public.access_code_attempts.attempts >= 4 then now() + interval '15 minutes'
      else public.access_code_attempts.locked_until
    end;

  select * into v_attempt from public.access_code_attempts where client_hash = p_client_hash;
  if v_attempt.locked_until is not null and v_attempt.locked_until > now() then
    return;
  end if;

  select sac.user_id, au.email into v_user_id, v_email
  from public.student_access_codes sac
  join auth.users au on au.id = sac.user_id
  join public.profiles p on p.user_id = sac.user_id and p.role = 'student'
  where sac.code_hash = p_code_hash
    and sac.is_active
    and (sac.expires_at is null or sac.expires_at > now())
  limit 1;

  if v_user_id is null or v_email is null then
    return;
  end if;

  update public.access_code_attempts
  set attempts = 0, locked_until = null
  where client_hash = p_client_hash;

  return query select v_email;
end;
$$;

revoke all on function public.verify_student_access_code(text, text) from public, anon, authenticated;
grant execute on function public.verify_student_access_code(text, text) to service_role;
drop function if exists public.consume_student_access_code(text, text);
