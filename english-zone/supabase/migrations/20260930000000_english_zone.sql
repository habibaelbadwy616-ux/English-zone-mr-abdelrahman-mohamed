create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'teacher')),
  full_name text not null,
  phone text not null,
  guardian_phone text not null default '',
  academic_stage text check (academic_stage in ('3rd Preparatory', '1st Secondary', '2nd Secondary', '3rd Secondary')),
  educational_system text check (educational_system in ('general', 'baccalaureate')),
  profile_picture_url text,
  teacher_id uuid references auth.users(id) on delete set null,
  access_status text not null default 'access_pending' check (access_status in ('account_active', 'payment_pending', 'access_pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_access (
  singleton boolean primary key default true check (singleton),
  teacher_id uuid not null unique references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_invites (
  email text primary key check (email = lower(email)),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_codes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique check (length(code_hash) = 64),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.student_access_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code_hash text not null unique check (length(code_hash) = 64),
  is_active boolean not null default true,
  is_single_use boolean not null default false,
  expires_at timestamptz,
  redeemed_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.access_code_attempts (
  client_hash text primary key check (length(client_hash) = 64),
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  academic_stage text not null,
  description text not null default '',
  price numeric(10, 2),
  original_price numeric(10, 2),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  lesson_count integer not null default 0 check (lesson_count >= 0),
  status text not null default 'available' check (status in ('available', 'full', 'coming_soon')),
  is_free boolean not null default false,
  is_published boolean not null default false,
  featured_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('new_course', 'new_lesson', 'new_exam', 'new_challenge', 'announcement', 'special_offer')),
  title text not null,
  body text not null default '',
  is_published boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  choices jsonb not null check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) >= 2),
  correct_answer text not null,
  position integer not null unique,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_reward_rules (
  id uuid primary key default gen_random_uuid(),
  minimum_score integer not null unique check (minimum_score between 0 and 100),
  discount_percent integer not null check (discount_percent between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  score integer not null check (score between 0 and 100),
  correct_count integer not null check (correct_count >= 0),
  question_count integer not null check (question_count > 0),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  claimed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table if not exists public.student_signup_tokens (
  signup_token_hash text primary key check (length(signup_token_hash) = 64),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  guardian_phone text not null,
  academic_stage text not null check (academic_stage in ('3rd Preparatory', '1st Secondary', '2nd Secondary', '3rd Secondary')),
  educational_system text check (educational_system in ('general', 'baccalaureate')),
  challenge_attempt_id uuid references public.challenge_attempts(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  consumed_by uuid references auth.users(id) on delete set null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  access_status text not null default 'payment_pending' check (access_status in ('payment_pending', 'access_pending', 'active')),
  approved_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create index if not exists profiles_teacher_id_idx on public.profiles(teacher_id);
create index if not exists courses_published_order_idx on public.courses(is_published, featured_order);
create index if not exists announcements_published_date_idx on public.announcements(is_published, published_at desc);
create index if not exists challenge_questions_public_order_idx on public.challenge_questions(is_published, position);
create index if not exists course_enrollments_student_idx on public.course_enrollments(student_id, access_status);

create or replace function public.is_authorized_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teacher_access
    where teacher_id = (select auth.uid()) and is_active = true
  );
$$;

create or replace function public.has_course_access(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_authorized_teacher() or exists (
    select 1 from public.course_enrollments
    where student_id = (select auth.uid()) and course_id = p_course_id and access_status = 'active'
  );
$$;

create or replace function public.handle_new_student()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_metadata jsonb := new.raw_user_meta_data;
  v_signup public.student_signup_tokens%rowtype;
begin
  if coalesce(v_metadata ->> 'role', 'student') = 'teacher' then
    if not exists (
      select 1 from public.teacher_invites
      where email = lower(coalesce(new.email, '')) and is_active
    ) then
      raise exception 'This teacher account has not been invited';
    end if;

    insert into public.profiles (user_id, role, full_name, phone, access_status)
    values (new.id, 'teacher', coalesce(nullif(btrim(v_metadata ->> 'full_name'), ''), new.email), '', 'account_active');
    insert into public.teacher_access (singleton, teacher_id) values (true, new.id);
    update public.teacher_invites set is_active = false where email = lower(new.email);
    return new;
  elsif coalesce(v_metadata ->> 'role', 'student') <> 'student' then
    raise exception 'This account role cannot be created through sign-up';
  end if;

  select * into v_signup
  from public.student_signup_tokens
  where signup_token_hash = encode(extensions.digest(coalesce(v_metadata ->> 'signup_token', ''), 'sha256'), 'hex')
    and consumed_at is null and expires_at > now()
  for update;

  if v_signup.signup_token_hash is null then
    raise exception 'Student registration is invalid or expired';
  end if;

  if not exists (select 1 from public.teacher_access where teacher_id = v_signup.teacher_id and is_active) then
    raise exception 'Teacher access is no longer active';
  end if;

  insert into public.profiles (user_id, full_name, phone, guardian_phone, academic_stage, educational_system, teacher_id)
  values (
    new.id,
    v_signup.full_name,
    v_signup.phone,
    v_signup.guardian_phone,
    v_signup.academic_stage,
    v_signup.educational_system,
    v_signup.teacher_id
  );

  if v_signup.challenge_attempt_id is not null then
    update public.challenge_attempts
    set claimed_by = new.id
    where id = v_signup.challenge_attempt_id and claimed_by is null and expires_at > now();
    if not found then
      raise exception 'Challenge reward is unavailable or has already been claimed';
    end if;
  end if;

  update public.student_signup_tokens set consumed_by = new.id, consumed_at = now()
  where signup_token_hash = v_signup.signup_token_hash;

  return new;
end;
$$;

create or replace function public.prepare_student_signup(
  p_teacher_code_hash text,
  p_signup_token_hash text,
  p_full_name text,
  p_phone text,
  p_guardian_phone text,
  p_academic_stage text,
  p_educational_system text,
  p_challenge_attempt_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid;
begin
  if p_teacher_code_hash is null or length(p_teacher_code_hash) <> 64
     or p_signup_token_hash is null or length(p_signup_token_hash) <> 64
     or nullif(btrim(p_full_name), '') is null
     or nullif(btrim(p_phone), '') is null
     or nullif(btrim(p_guardian_phone), '') is null
     or p_academic_stage not in ('3rd Preparatory', '1st Secondary', '2nd Secondary', '3rd Secondary')
     or (p_academic_stage <> '3rd Preparatory' and p_educational_system not in ('general', 'baccalaureate'))
     or (p_educational_system is not null and p_educational_system not in ('general', 'baccalaureate')) then
    raise exception 'Student registration details are invalid';
  end if;

  select tc.teacher_id into v_teacher_id
  from public.teacher_codes tc
  join public.teacher_access ta on ta.teacher_id = tc.teacher_id and ta.is_active
  where tc.is_active
    and (tc.expires_at is null or tc.expires_at > now())
    and tc.code_hash = p_teacher_code_hash
  limit 1;

  if v_teacher_id is null then
    raise exception 'Teacher code is invalid or expired';
  end if;

  insert into public.student_signup_tokens (signup_token_hash, teacher_id, full_name, phone, guardian_phone, academic_stage, educational_system, challenge_attempt_id)
  values (p_signup_token_hash, v_teacher_id, btrim(p_full_name), btrim(p_phone), btrim(p_guardian_phone), p_academic_stage, p_educational_system, p_challenge_attempt_id);
end;
$$;

create or replace function public.clear_student_signup_token(p_user_id uuid, p_signup_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1 from public.student_signup_tokens
    where signup_token_hash = p_signup_token_hash and consumed_by = p_user_id and consumed_at > now() - interval '10 minutes'
  ) then
    return false;
  end if;
  update auth.users set raw_user_meta_data = raw_user_meta_data - 'signup_token' where id = p_user_id;
  return found;
end;
$$;

drop trigger if exists on_auth_student_created on auth.users;
create trigger on_auth_student_created
  after insert on auth.users
  for each row execute procedure public.handle_new_student();

create or replace function public.consume_student_access_code(p_code_hash text, p_client_hash text)
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
    and (not sac.is_single_use or sac.redeemed_at is null)
  limit 1;

  if v_user_id is null or v_email is null then
    return;
  end if;

  update public.student_access_codes
  set last_used_at = now(), redeemed_at = case when is_single_use then now() else redeemed_at end
  where user_id = v_user_id;
  update public.access_code_attempts set attempts = 0, locked_until = null where client_hash = p_client_hash;
  return query select v_email;
end;
$$;

create or replace function public.submit_public_challenge(p_answers jsonb)
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
  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers must be an array';
  end if;

  select count(*) into v_total from public.challenge_questions
  where is_published and position <= 5;

  if v_total < 1 or jsonb_array_length(p_answers) <> v_total then
    raise exception 'The submitted challenge is incomplete';
  end if;

  if (select count(distinct item ->> 'questionId') from jsonb_array_elements(p_answers) item) <> v_total
     or exists (
       select 1 from jsonb_array_elements(p_answers) item
       where not exists (
         select 1 from public.challenge_questions q
         where q.id::text = item ->> 'questionId' and q.is_published and q.position <= 5
       )
     ) then
    raise exception 'The submitted challenge is invalid';
  end if;

  select count(*) filter (where q.correct_answer = item ->> 'choice') into v_correct
  from public.challenge_questions q
  join jsonb_array_elements(p_answers) item on q.id::text = item ->> 'questionId'
  where q.is_published and q.position <= 5;

  v_score := round((v_correct::numeric / v_total) * 100)::integer;
  select r.discount_percent into v_discount
  from public.challenge_reward_rules r
  where r.is_active and v_score >= r.minimum_score
  order by r.minimum_score desc
  limit 1;
  v_discount := coalesce(v_discount, 0);

  insert into public.challenge_attempts (score, correct_count, question_count, discount_percent)
  values (v_score, v_correct, v_total, v_discount)
  returning id into v_attempt_id;

  return query select v_attempt_id, v_score, v_total, v_discount;
end;
$$;

create or replace function public.teacher_set_course_access(p_student_id uuid, p_course_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_authorized_teacher() then
    raise exception 'Teacher access required';
  end if;
  if p_status not in ('payment_pending', 'access_pending', 'active') then
    raise exception 'Invalid course access status';
  end if;
  insert into public.course_enrollments (student_id, course_id, access_status, approved_by, updated_at)
  values (p_student_id, p_course_id, p_status, (select auth.uid()), now())
  on conflict (student_id, course_id) do update
  set access_status = excluded.access_status, approved_by = excluded.approved_by, updated_at = now();
end;
$$;

alter table public.profiles enable row level security;
alter table public.teacher_access enable row level security;
alter table public.teacher_invites enable row level security;
alter table public.teacher_codes enable row level security;
alter table public.student_access_codes enable row level security;
alter table public.access_code_attempts enable row level security;
alter table public.courses enable row level security;
alter table public.announcements enable row level security;
alter table public.challenge_questions enable row level security;
alter table public.challenge_reward_rules enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.student_signup_tokens enable row level security;
alter table public.course_enrollments enable row level security;

revoke all on public.teacher_access, public.teacher_invites, public.teacher_codes, public.student_access_codes, public.access_code_attempts, public.challenge_questions, public.challenge_attempts, public.student_signup_tokens from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant select on public.profiles to authenticated;
grant update (full_name, phone, guardian_phone, academic_stage, educational_system, profile_picture_url, updated_at) on public.profiles to authenticated;
grant select on public.courses, public.announcements, public.challenge_reward_rules to anon, authenticated;
grant select, insert, update, delete on public.courses, public.announcements, public.challenge_reward_rules, public.challenge_questions, public.teacher_codes, public.student_access_codes, public.teacher_access, public.course_enrollments to authenticated;
revoke all on public.access_code_attempts from authenticated;
grant select on public.course_enrollments to authenticated;
grant execute on function public.is_authorized_teacher() to authenticated;
grant execute on function public.has_course_access(uuid) to authenticated;
grant execute on function public.teacher_set_course_access(uuid, uuid, text) to authenticated;
grant execute on function public.consume_student_access_code(text, text) to service_role;
grant execute on function public.submit_public_challenge(jsonb) to service_role;
grant execute on function public.prepare_student_signup(text, text, text, text, text, text, text, uuid) to service_role;
grant execute on function public.clear_student_signup_token(uuid, text) to service_role;
revoke all on function public.consume_student_access_code(text, text) from public, anon, authenticated;
revoke all on function public.submit_public_challenge(jsonb) from public, anon, authenticated;
revoke all on function public.prepare_student_signup(text, text, text, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.clear_student_signup_token(uuid, text) from public, anon, authenticated;

create policy "Students read their own profile and teacher reads students"
on public.profiles for select to authenticated
using (user_id = (select auth.uid()) or public.is_authorized_teacher());

create policy "Students update their own profile and teacher updates profiles"
on public.profiles for update to authenticated
using (user_id = (select auth.uid()) or public.is_authorized_teacher())
with check (user_id = (select auth.uid()) or public.is_authorized_teacher());

create policy "Published courses are visible to everyone"
on public.courses for select to anon, authenticated
using (is_published or public.is_authorized_teacher());
create policy "Authorized teacher manages courses"
on public.courses for all to authenticated
using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());

create policy "Published announcements are visible to everyone"
on public.announcements for select to anon, authenticated
using (is_published or public.is_authorized_teacher());
create policy "Authorized teacher manages announcements"
on public.announcements for all to authenticated
using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());

create policy "Published reward rules are public"
on public.challenge_reward_rules for select to anon, authenticated
using (is_active or public.is_authorized_teacher());
create policy "Authorized teacher manages reward rules"
on public.challenge_reward_rules for all to authenticated
using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());

create policy "Students and teacher can read enrollment status"
on public.course_enrollments for select to authenticated
using (student_id = (select auth.uid()) or public.is_authorized_teacher());

insert into public.challenge_reward_rules (minimum_score, discount_percent, is_active)
values (60, 20, true), (75, 30, true), (90, 50, true)
on conflict (minimum_score) do update set discount_percent = excluded.discount_percent, is_active = true;

insert into public.challenge_questions (id, prompt, choices, correct_answer, position, is_published)
values
  ('d5537a6e-7bf1-4d1e-9d50-9c6a96e84701', 'Choose the correct sentence.', '["She go to school every day.", "She goes to school every day.", "She going to school every day."]'::jsonb, 'She goes to school every day.', 1, true),
  ('d5537a6e-7bf1-4d1e-9d50-9c6a96e84702', 'What is the closest meaning of “generous”?', '["Willing to give and share", "Quick to become angry", "Careful with every detail"]'::jsonb, 'Willing to give and share', 2, true),
  ('d5537a6e-7bf1-4d1e-9d50-9c6a96e84703', 'Complete the sentence: If I had more time, I ___ another book.', '["will read", "would read", "am reading"]'::jsonb, 'would read', 3, true),
  ('d5537a6e-7bf1-4d1e-9d50-9c6a96e84704', 'Choose the correct preposition: She is interested ___ science.', '["on", "at", "in"]'::jsonb, 'in', 4, true),
  ('d5537a6e-7bf1-4d1e-9d50-9c6a96e84705', 'Which word is an antonym of “ancient”?', '["Modern", "Historic", "Traditional"]'::jsonb, 'Modern', 5, true)
on conflict (id) do update
set prompt = excluded.prompt, choices = excluded.choices, correct_answer = excluded.correct_answer, position = excluded.position, is_published = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

create policy "Profile pictures are publicly readable"
on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');
create policy "Students upload their own profile picture"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Students update their own profile picture"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Students delete their own profile picture"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);