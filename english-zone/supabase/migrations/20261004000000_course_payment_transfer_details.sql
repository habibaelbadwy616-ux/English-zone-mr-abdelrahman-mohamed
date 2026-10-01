alter table public.payment_requests
  add column if not exists sender_phone text not null default '',
  add column if not exists transferred_at date;

drop function if exists public.submit_course_payment(uuid, text);

create or replace function public.submit_course_payment(
  p_course_id uuid,
  p_proof_path text,
  p_sender_phone text,
  p_transfer_date date
)
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
  if v_user_id is null
     or p_proof_path is null
     or split_part(p_proof_path, '/', 1) <> v_user_id::text
     or nullif(btrim(p_sender_phone), '') is null
     or length(btrim(p_sender_phone)) < 6
     or length(btrim(p_sender_phone)) > 30
     or p_transfer_date is null
     or p_transfer_date > current_date then
    raise exception 'Payment details are invalid';
  end if;

  if not exists (
    select 1 from public.profiles
    where user_id = v_user_id and role = 'student' and access_status = 'account_active'
  ) then
    raise exception 'An active student account is required';
  end if;

  select * into v_course from public.courses
  where id = p_course_id and is_published and not is_free;
  if v_course.id is null or coalesce(v_course.price, 0) <= 0 then
    raise exception 'This course is not available for payment';
  end if;
  if exists (
    select 1 from public.course_enrollments
    where student_id = v_user_id and course_id = p_course_id and access_status = 'active'
  ) then
    raise exception 'You already have access to this course';
  end if;
  if exists (
    select 1 from public.payment_requests
    where student_id = v_user_id and course_id = p_course_id and status = 'pending'
  ) then
    raise exception 'Your payment request is already under review';
  end if;

  insert into public.payment_requests (student_id, course_id, amount, proof_path, sender_phone, transferred_at)
  values (v_user_id, p_course_id, v_course.price, p_proof_path, btrim(p_sender_phone), p_transfer_date)
  returning id into v_payment_id;

  insert into public.course_enrollments (student_id, course_id, access_status)
  values (v_user_id, p_course_id, 'payment_pending')
  on conflict (student_id, course_id) do update
    set access_status = case
      when public.course_enrollments.access_status = 'active' then 'active'
      else 'payment_pending'
    end,
    updated_at = now();

  return v_payment_id;
end;
$$;

revoke all on function public.submit_course_payment(uuid, text, text, date) from public, anon;
grant execute on function public.submit_course_payment(uuid, text, text, date) to authenticated;
notify pgrst, 'reload schema';