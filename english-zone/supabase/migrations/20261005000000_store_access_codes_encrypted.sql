alter table public.student_access_codes
  add column if not exists code_ciphertext text;