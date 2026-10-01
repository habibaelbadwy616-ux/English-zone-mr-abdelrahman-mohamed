create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  submitted_at timestamptz not null default now()
);

create index if not exists homework_submissions_lesson_idx
  on public.homework_submissions(lesson_id, submitted_at desc);
create index if not exists homework_submissions_student_idx
  on public.homework_submissions(student_id, submitted_at desc);

alter table public.homework_submissions enable row level security;
grant select, insert on public.homework_submissions to authenticated;

create policy "Teachers read homework submissions"
  on public.homework_submissions for select to authenticated
  using (public.is_authorized_teacher());
create policy "Students read own homework submissions"
  on public.homework_submissions for select to authenticated
  using (student_id = (select auth.uid()));
create policy "Students submit homework for active lessons"
  on public.homework_submissions for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.lessons l
      join public.profiles p on p.user_id = (select auth.uid())
      where l.id = lesson_id
        and l.is_published
        and p.role = 'student'
        and p.access_status = 'account_active'
        and public.has_course_access(l.course_id)
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homework-submissions',
  'homework-submissions',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Teachers read homework files"
  on storage.objects for select to authenticated
  using (bucket_id = 'homework-submissions' and public.is_authorized_teacher());
create policy "Students read own homework files"
  on storage.objects for select to authenticated
  using (bucket_id = 'homework-submissions' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Students upload homework files for active lessons"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'homework-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.lessons l
      join public.profiles p on p.user_id = (select auth.uid())
      where l.id::text = (storage.foldername(name))[2]
        and l.is_published
        and p.role = 'student'
        and p.access_status = 'account_active'
        and public.has_course_access(l.course_id)
    )
  );
create policy "Students remove orphaned homework files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'homework-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
