alter table public.profiles
  add column if not exists student_code text unique default ('EZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));

update public.profiles
set student_code = 'EZ-' || upper(substr(replace(user_id::text, '-', ''), 1, 10))
where student_code is null;

alter table public.courses
  add column if not exists cover_image_url text,
  add column if not exists student_limit integer,
  add column if not exists educational_system text check (educational_system in ('general', 'baccalaureate'));

alter table public.announcements
  add column if not exists audience_type text not null default 'all' check (audience_type in ('all', 'course', 'stage')),
  add column if not exists audience_value text;

create table if not exists public.course_playlists (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  playlist_id uuid references public.course_playlists(id) on delete set null,
  title text not null,
  description text not null default '',
  video_url text,
  materials jsonb not null default '[]'::jsonb check (jsonb_typeof(materials) = 'array'),
  homework text not null default '',
  position integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  student_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  duration_minutes integer not null default 30 check (duration_minutes between 1 and 300),
  passing_score integer not null default 60 check (passing_score between 0 and 100),
  show_results boolean not null default true,
  show_correct_answers boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.exams
  add column if not exists scheduled_at timestamptz;

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_type text not null check (question_type in ('multiple_choice', 'true_false', 'fill_blank')),
  prompt text not null,
  choices jsonb not null default '[]'::jsonb check (jsonb_typeof(choices) = 'array'),
  correct_answer text not null,
  points integer not null default 1 check (points > 0),
  position integer not null default 0
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  correct_count integer not null default 0,
  question_count integer not null default 0,
  submitted_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  attended_on date not null default current_date,
  status text not null check (status in ('present', 'absent')),
  marked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, course_id, attended_on)
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount numeric(10, 2) not null check (amount >= 0),
  payment_method text not null default 'InstaPay',
  proof_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  setting_key text primary key,
  setting_value text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.course_playlists enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.attendance_records enable row level security;
alter table public.payment_requests enable row level security;
alter table public.platform_settings enable row level security;

revoke all on public.course_playlists, public.lessons, public.lesson_progress, public.exams,
  public.exam_questions, public.exam_attempts, public.attendance_records, public.payment_requests,
  public.platform_settings from anon, authenticated;
grant all on public.course_playlists, public.lessons, public.lesson_progress, public.exams,
  public.exam_questions, public.exam_attempts, public.attendance_records, public.payment_requests,
  public.platform_settings to service_role;
grant select, insert, update, delete on public.course_playlists, public.lessons, public.exams,
  public.exam_questions, public.attendance_records, public.platform_settings to authenticated;
grant select, insert, delete on public.lesson_progress to authenticated;
grant select, insert on public.exam_attempts to authenticated;
grant select on public.payment_requests to authenticated;
grant select (setting_key, setting_value) on public.platform_settings to anon, authenticated;
revoke all on public.exam_questions, public.exam_attempts from authenticated;
grant insert, update, delete on public.exam_questions to authenticated;
grant select (id, exam_id, question_type, prompt, choices, points, position) on public.exam_questions to authenticated;
grant select (id, exam_id, score, correct_count, question_count, submitted_at, student_id) on public.exam_attempts to authenticated;
grant select (id, score, correct_count, question_count, discount_percent, claimed_by, created_at, expires_at) on public.challenge_attempts to authenticated;

create policy "Teacher manages playlists" on public.course_playlists for all to authenticated
  using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());
create policy "Students read playlists with active access" on public.course_playlists for select to authenticated
  using (public.is_authorized_teacher() or public.has_course_access(course_id));
create policy "Students read lessons with active access" on public.lessons for select to authenticated
  using (public.is_authorized_teacher() or (is_published and public.has_course_access(course_id)));
create policy "Teacher manages lessons" on public.lessons for all to authenticated
  using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());
create policy "Students manage their own lesson progress" on public.lesson_progress for all to authenticated
  using (student_id = (select auth.uid()) and public.has_course_access((select l.course_id from public.lessons l where l.id = lesson_id)))
  with check (student_id = (select auth.uid()) and public.has_course_access((select l.course_id from public.lessons l where l.id = lesson_id)));
create policy "Teacher reads lesson progress" on public.lesson_progress for select to authenticated
  using (public.is_authorized_teacher());
create policy "Students read available exams" on public.exams for select to authenticated
  using (public.is_authorized_teacher() or (is_published and public.has_course_access(course_id)));
create policy "Teacher manages exams" on public.exams for all to authenticated
  using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());
create policy "Students read available exam questions" on public.exam_questions for select to authenticated
  using (public.is_authorized_teacher() or exists (select 1 from public.exams e where e.id = exam_id and e.is_published and public.has_course_access(e.course_id)));
create policy "Teacher manages exam questions" on public.exam_questions for all to authenticated
  using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());
create policy "Students read visible exam results" on public.exam_attempts for select to authenticated
  using (public.is_authorized_teacher() or (student_id = (select auth.uid()) and exists (select 1 from public.exams e where e.id = exam_id and e.show_results)));
create policy "Teacher manages attendance" on public.attendance_records for all to authenticated
  using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());
create policy "Students read own attendance" on public.attendance_records for select to authenticated
  using (student_id = (select auth.uid()));
create policy "Teacher manages payment requests" on public.payment_requests for all to authenticated
  using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());
create policy "Students read own payment requests" on public.payment_requests for select to authenticated
  using (student_id = (select auth.uid()));
create policy "Teacher manages platform settings" on public.platform_settings for all to authenticated
  using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());
create policy "Students read InstaPay setting" on public.platform_settings for select to anon, authenticated
  using (setting_key = 'instapay_number');
create policy "Students read own challenge rewards" on public.challenge_attempts for select to authenticated
  using (claimed_by = (select auth.uid()) or public.is_authorized_teacher());
create policy "Teacher manages challenge questions" on public.challenge_questions for all to authenticated
  using (public.is_authorized_teacher()) with check (public.is_authorized_teacher());
create policy "Payment proofs are private to student and teacher" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and (public.is_authorized_teacher() or (storage.foldername(name))[1] = (select auth.uid())::text));
create policy "Students upload their own payment proofs" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Published announcements are visible to everyone" on public.announcements;
create policy "Published announcements are visible to their audience" on public.announcements for select to anon, authenticated
  using (is_published and (
    audience_type = 'all'
    or (auth.uid() is not null and audience_type = 'stage' and audience_value = (select academic_stage from public.profiles where user_id = (select auth.uid())))
    or (auth.uid() is not null and audience_type = 'course' and exists (
      select 1 from public.course_enrollments e where e.student_id = (select auth.uid()) and e.course_id::text = public.announcements.audience_value and e.access_status = 'active'
    ))
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-covers', 'course-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;
create policy "Course covers are publicly readable" on storage.objects for select to anon, authenticated
  using (bucket_id = 'course-covers');
create policy "Teacher uploads course covers" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-covers' and public.is_authorized_teacher());
create policy "Teacher updates course covers" on storage.objects for update to authenticated
  using (bucket_id = 'course-covers' and public.is_authorized_teacher())
  with check (bucket_id = 'course-covers' and public.is_authorized_teacher());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-materials', 'course-materials', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 20971520, allowed_mime_types = excluded.allowed_mime_types;
create policy "Students read materials for active lessons" on storage.objects for select to authenticated
  using (bucket_id = 'course-materials' and (
    public.is_authorized_teacher()
    or exists (
      select 1 from public.lessons l
      where l.id::text = (storage.foldername(name))[2]
        and l.course_id::text = (storage.foldername(name))[1]
        and l.is_published
        and public.has_course_access(l.course_id)
    )
  ));
create policy "Teacher uploads course materials" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-materials' and public.is_authorized_teacher());
create policy "Teacher updates course materials" on storage.objects for update to authenticated
  using (bucket_id = 'course-materials' and public.is_authorized_teacher())
  with check (bucket_id = 'course-materials' and public.is_authorized_teacher());

create or replace function public.teacher_list_students()
returns table(user_id uuid, email text, full_name text, phone text, guardian_phone text, academic_stage text,
  educational_system text, profile_picture_url text, access_status text, student_code text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, u.email::text, p.full_name, p.phone, p.guardian_phone, p.academic_stage,
    p.educational_system, p.profile_picture_url, p.access_status, p.student_code, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.role = 'student' and public.is_authorized_teacher()
  order by p.created_at desc;
$$;
grant execute on function public.teacher_list_students() to authenticated;
revoke all on function public.teacher_list_students() from public, anon;
revoke insert on public.exam_attempts from authenticated;

insert into public.platform_settings (setting_key, setting_value)
values ('instapay_number', '01014812293')
on conflict (setting_key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.handle_new_student()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_metadata jsonb := new.raw_user_meta_data;
  v_signup public.student_signup_tokens%rowtype;
  v_teacher_id uuid;
  v_name text;
  v_phone text;
  v_guardian_phone text;
  v_stage text;
  v_system text;
  v_challenge_attempt_id uuid;
begin
  if coalesce(v_metadata ->> 'role', 'student') = 'teacher' then
    if not exists (select 1 from public.teacher_invites where email = lower(coalesce(new.email, '')) and is_active) then
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

  if nullif(v_metadata ->> 'signup_token', '') is not null then
    select * into v_signup from public.student_signup_tokens
    where signup_token_hash = encode(extensions.digest(v_metadata ->> 'signup_token', 'sha256'), 'hex')
      and consumed_at is null and expires_at > now() for update;
    if v_signup.signup_token_hash is null then raise exception 'Student registration is invalid or expired'; end if;
    v_teacher_id := v_signup.teacher_id;
    v_name := v_signup.full_name;
    v_phone := v_signup.phone;
    v_guardian_phone := v_signup.guardian_phone;
    v_stage := v_signup.academic_stage;
    v_system := v_signup.educational_system;
    v_challenge_attempt_id := v_signup.challenge_attempt_id;
  else
    select teacher_id into v_teacher_id from public.teacher_access where singleton and is_active;
    v_name := nullif(btrim(v_metadata ->> 'full_name'), '');
    v_phone := nullif(btrim(v_metadata ->> 'phone'), '');
    v_guardian_phone := nullif(btrim(v_metadata ->> 'guardian_phone'), '');
    v_stage := v_metadata ->> 'academic_stage';
    v_system := nullif(v_metadata ->> 'educational_system', '');
    if nullif(v_metadata ->> 'challenge_attempt_id', '') is not null then
      begin v_challenge_attempt_id := (v_metadata ->> 'challenge_attempt_id')::uuid;
      exception when invalid_text_representation then raise exception 'Challenge reward is invalid'; end;
    end if;
  end if;

  if v_teacher_id is null or v_name is null or v_phone is null or v_guardian_phone is null
     or v_stage not in ('3rd Preparatory', '1st Secondary', '2nd Secondary', '3rd Secondary')
     or (v_stage <> '3rd Preparatory' and v_system not in ('general', 'baccalaureate'))
     or (v_system is not null and v_system not in ('general', 'baccalaureate')) then
    raise exception 'Student registration details are invalid';
  end if;
  if not exists (select 1 from public.teacher_access where teacher_id = v_teacher_id and is_active) then
    raise exception 'Teacher access is no longer active';
  end if;

  insert into public.profiles (user_id, full_name, phone, guardian_phone, academic_stage, educational_system, teacher_id)
  values (new.id, v_name, v_phone, v_guardian_phone, v_stage, v_system, v_teacher_id);
  if v_challenge_attempt_id is not null then
    update public.challenge_attempts set claimed_by = new.id
    where id = v_challenge_attempt_id and claimed_by is null and expires_at > now();
    if not found then raise exception 'Challenge reward is unavailable or has already been claimed'; end if;
  end if;
  if v_signup.signup_token_hash is not null then
    update public.student_signup_tokens set consumed_by = new.id, consumed_at = now()
    where signup_token_hash = v_signup.signup_token_hash;
  end if;
  return new;
end;
$$;

create or replace function public.submit_course_payment(p_course_id uuid, p_proof_path text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_course public.courses%rowtype;
  v_payment_id uuid;
begin
  if v_user_id is null or p_proof_path is null or split_part(p_proof_path, '/', 1) <> v_user_id::text then
    raise exception 'Payment details are invalid';
  end if;
  select * into v_course from public.courses where id = p_course_id and is_published and not is_free;
  if v_course.id is null or coalesce(v_course.price, 0) <= 0 then raise exception 'This course is not available for payment'; end if;
  if exists (select 1 from public.course_enrollments where student_id = v_user_id and course_id = p_course_id and access_status = 'active') then
    raise exception 'You already have access to this course';
  end if;
  if exists (select 1 from public.payment_requests where student_id = v_user_id and course_id = p_course_id and status = 'pending') then
    raise exception 'Your payment request is already under review';
  end if;
  insert into public.payment_requests (student_id, course_id, amount, proof_path)
  values (v_user_id, p_course_id, v_course.price, p_proof_path) returning id into v_payment_id;
  insert into public.course_enrollments (student_id, course_id, access_status)
  values (v_user_id, p_course_id, 'payment_pending')
  on conflict (student_id, course_id) do update set access_status = case when public.course_enrollments.access_status = 'active' then 'active' else 'payment_pending' end, updated_at = now();
  return v_payment_id;
end;
$$;

create or replace function public.teacher_review_course_payment(p_payment_id uuid, p_status text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_payment public.payment_requests%rowtype;
begin
  if not public.is_authorized_teacher() then raise exception 'Teacher access required'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'Invalid payment status'; end if;
  update public.payment_requests set status = p_status, rejection_note = case when p_status = 'rejected' then left(coalesce(p_note, ''), 500) else '' end,
    reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id and status = 'pending' returning * into v_payment;
  if v_payment.id is null then raise exception 'Payment request is no longer pending'; end if;
  if p_status = 'approved' then
    insert into public.course_enrollments (student_id, course_id, access_status, approved_by, updated_at)
    values (v_payment.student_id, v_payment.course_id, 'active', auth.uid(), now())
    on conflict (student_id, course_id) do update set access_status = 'active', approved_by = auth.uid(), updated_at = now();
  end if;
end;
$$;

create or replace function public.teacher_assign_course(p_student_id uuid, p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_is_free boolean;
begin
  if not public.is_authorized_teacher() then raise exception 'Teacher access required'; end if;
  if not exists (select 1 from public.profiles where user_id = p_student_id and role = 'student') then raise exception 'Student not found'; end if;
  select is_free into v_is_free from public.courses where id = p_course_id and is_published;
  if not found then raise exception 'Course not found'; end if;
  insert into public.course_enrollments (student_id, course_id, access_status, approved_by, updated_at)
  values (p_student_id, p_course_id, case when v_is_free then 'active' else 'payment_pending' end, case when v_is_free then auth.uid() else null end, now())
  on conflict (student_id, course_id) do nothing;
end;
$$;

create or replace function public.teacher_grant_course_access(p_student_id uuid, p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_authorized_teacher() then raise exception 'Teacher access required'; end if;
  insert into public.course_enrollments (student_id, course_id, access_status, approved_by, updated_at)
  values (p_student_id, p_course_id, 'active', auth.uid(), now())
  on conflict (student_id, course_id) do update set access_status = 'active', approved_by = auth.uid(), updated_at = now();
end;
$$;

create or replace function public.student_enroll_free_course(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_student_id uuid := auth.uid();
  v_course public.courses%rowtype;
  v_enrolled integer;
begin
  if v_student_id is null or not exists (select 1 from public.profiles where user_id = v_student_id and role = 'student') then
    raise exception 'Student access required';
  end if;
  select * into v_course from public.courses where id = p_course_id and is_published and is_free for update;
  if v_course.id is null then raise exception 'This free course is not available'; end if;
  if v_course.student_limit is not null then
    select count(*) into v_enrolled from public.course_enrollments where course_id = p_course_id and access_status = 'active';
    if v_enrolled >= v_course.student_limit and not exists (select 1 from public.course_enrollments where student_id = v_student_id and course_id = p_course_id) then
      raise exception 'This course has reached its student limit';
    end if;
  end if;
  insert into public.course_enrollments (student_id, course_id, access_status, updated_at)
  values (v_student_id, p_course_id, 'active', now())
  on conflict (student_id, course_id) do update set access_status = 'active', updated_at = now();
end;
$$;

create or replace function public.submit_exam_attempt(p_exam_id uuid, p_answers jsonb)
returns table(attempt_id uuid, score integer, correct_count integer, question_count integer, show_correct_answers boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_exam public.exams%rowtype;
  v_total integer;
  v_correct integer;
  v_score integer;
  v_id uuid;
begin
  select * into v_exam from public.exams where id = p_exam_id and is_published;
  if v_exam.id is null or not public.has_course_access(v_exam.course_id) then raise exception 'Exam is not available'; end if;
  select count(*) into v_total from public.exam_questions where exam_id = p_exam_id;
  if v_total < 1 or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> v_total then raise exception 'Complete every question'; end if;
  if (select count(distinct item ->> 'questionId') from jsonb_array_elements(p_answers) item) <> v_total
     or exists (
       select 1 from jsonb_array_elements(p_answers) item
       where not exists (
         select 1 from public.exam_questions q
         where q.id::text = item ->> 'questionId' and q.exam_id = p_exam_id
       )
     ) then
    raise exception 'The submitted answers are invalid';
  end if;
  select count(*) into v_correct from public.exam_questions q
  join jsonb_array_elements(p_answers) a on a ->> 'questionId' = q.id::text and lower(trim(a ->> 'answer')) = lower(trim(q.correct_answer))
  where q.exam_id = p_exam_id;
  v_score := round(v_correct::numeric * 100 / v_total)::integer;
  insert into public.exam_attempts (exam_id, student_id, score, correct_count, question_count)
  values (p_exam_id, auth.uid(), v_score, v_correct, v_total) returning id into v_id;
  return query select v_id, case when v_exam.show_results then v_score else null end,
    case when v_exam.show_results then v_correct else null end,
    case when v_exam.show_results then v_total else null end, v_exam.show_correct_answers;
end;
$$;

grant execute on function public.submit_course_payment(uuid, text) to authenticated;
grant execute on function public.teacher_review_course_payment(uuid, text, text) to authenticated;
grant execute on function public.teacher_assign_course(uuid, uuid) to authenticated;
grant execute on function public.teacher_grant_course_access(uuid, uuid) to authenticated;
grant execute on function public.student_enroll_free_course(uuid) to authenticated;
grant execute on function public.submit_exam_attempt(uuid, jsonb) to authenticated;
revoke all on function public.submit_course_payment(uuid, text) from public, anon;
revoke all on function public.teacher_review_course_payment(uuid, text, text) from public, anon;
revoke all on function public.teacher_assign_course(uuid, uuid) from public, anon;
revoke all on function public.teacher_grant_course_access(uuid, uuid) from public, anon;
revoke all on function public.student_enroll_free_course(uuid) from public, anon;
revoke all on function public.submit_exam_attempt(uuid, jsonb) from public, anon;

create index if not exists lesson_course_position_idx on public.lessons(course_id, position);
create index if not exists exams_course_created_idx on public.exams(course_id, created_at desc);
create index if not exists attendance_student_date_idx on public.attendance_records(student_id, attended_on desc);
create index if not exists payments_status_date_idx on public.payment_requests(status, created_at desc);
create index if not exists payments_student_date_idx on public.payment_requests(student_id, created_at desc);