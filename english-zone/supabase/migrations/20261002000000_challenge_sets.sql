create table if not exists public.challenge_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.challenge_questions
  add column if not exists challenge_id uuid references public.challenge_sets(id) on delete cascade;

alter table public.challenge_questions
  drop constraint if exists challenge_questions_position_key;

with ranked as (
  select id, row_number() over (order by position, id) as row_number, is_published
  from public.challenge_questions
), grouped as (
  select ceil(row_number::numeric / 5)::integer as group_number,
    count(*) as question_count, bool_and(is_published) as all_published
  from ranked
  group by ceil(row_number::numeric / 5)::integer
), inserted as (
  insert into public.challenge_sets (title, position, is_published)
  select 'Challenge ' || group_number, group_number,
    question_count = 5 and all_published
  from grouped
  returning id, position
)
update public.challenge_questions question
set challenge_id = inserted.id,
    position = ((ranked.row_number - 1) % 5 + 1)::integer
from ranked
join inserted on inserted.position = ceil(ranked.row_number::numeric / 5)::integer
where question.id = ranked.id;

alter table public.challenge_questions
  alter column challenge_id set not null,
  add constraint challenge_questions_position_range check (position between 1 and 5);

create unique index if not exists challenge_questions_set_position_idx
  on public.challenge_questions(challenge_id, position);

alter table public.challenge_sets enable row level security;
revoke all on public.challenge_sets from anon, authenticated;
grant select, insert, update, delete on public.challenge_sets to authenticated;
grant all on public.challenge_sets to service_role;

create policy "Teacher manages challenge sets" on public.challenge_sets for all to authenticated
  using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());

drop function if exists public.submit_public_challenge(jsonb);

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
     )
  ) then
    raise exception 'The submitted challenge is invalid';
  end if;

  select count(*) filter (where question.correct_answer = item ->> 'choice') into v_correct
  from public.challenge_questions question
  join jsonb_array_elements(p_answers) item on question.id::text = item ->> 'questionId'
  where question.challenge_id = p_challenge_id and question.is_published;

  v_score := round((v_correct::numeric / v_total) * 100)::integer;
  select rule.discount_percent into v_discount
  from public.challenge_reward_rules rule
  where rule.is_active and v_score >= rule.minimum_score
  order by rule.minimum_score desc
  limit 1;
  v_discount := coalesce(v_discount, 0);

  insert into public.challenge_attempts (score, correct_count, question_count, discount_percent)
  values (v_score, v_correct, v_total, v_discount)
  returning id into v_attempt_id;

  return query select v_attempt_id, v_score, v_total, v_discount;
end;
$$;

grant execute on function public.submit_public_challenge(uuid, jsonb) to service_role;
revoke all on function public.submit_public_challenge(uuid, jsonb) from public, anon, authenticated;

notify pgrst, 'reload schema';