update public.challenge_reward_rules
set is_active = false;

insert into public.challenge_reward_rules (minimum_score, discount_percent, is_active)
values
  (20, 5, true),
  (40, 10, true),
  (60, 15, true),
  (80, 20, true),
  (100, 25, true)
on conflict (minimum_score) do update
set discount_percent = excluded.discount_percent,
    is_active = true;

create or replace function public.submit_public_challenge(p_challenge_id uuid, p_answers jsonb)
returns table(attempt_id uuid, score integer, total integer, discount_percent integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_correct integer;
  v_score integer;
  v_discount integer := 0;
  v_attempt_id uuid;
begin
  if p_challenge_id is null or jsonb_typeof(p_answers) <> 'array'
     or jsonb_array_length(p_answers) <> 5 then
    raise exception 'A challenge must contain exactly five answers';
  end if;

  if not exists (
    select 1 from public.challenge_sets
    where id = p_challenge_id and is_published
  ) then
    raise exception 'This challenge is not available';
  end if;

  select count(*) into v_total
  from public.challenge_questions
  where challenge_id = p_challenge_id and is_published;

  if v_total <> 5 then
    raise exception 'This challenge is incomplete';
  end if;

  if (
       (select count(distinct item ->> 'questionId')
        from jsonb_array_elements(p_answers) item) <> 5
       or exists (
       select 1 from jsonb_array_elements(p_answers) item
       where not exists (
         select 1 from public.challenge_questions question
         where question.id::text = item ->> 'questionId'
           and question.challenge_id = p_challenge_id
           and question.is_published
       )
       )
     ) then
    raise exception 'The submitted challenge is invalid';
  end if;

  select count(*) filter (where question.correct_answer = item ->> 'choice') into v_correct
  from public.challenge_questions question
  join jsonb_array_elements(p_answers) item on question.id::text = item ->> 'questionId'
  where question.challenge_id = p_challenge_id and question.is_published;

  v_score := round((v_correct::numeric / v_total) * 100)::integer;
  v_discount := floor((v_correct::numeric / v_total) * 25)::integer;

  insert into public.challenge_attempts (score, correct_count, question_count, discount_percent)
  values (v_score, v_correct, v_total, v_discount)
  returning id into v_attempt_id;

  return query select v_attempt_id, v_score, v_total, v_discount;
end;
$$;

grant execute on function public.submit_public_challenge(uuid, jsonb) to service_role;
revoke all on function public.submit_public_challenge(uuid, jsonb) from public, anon, authenticated;

notify pgrst, 'reload schema';
