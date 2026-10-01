import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const isTeacherPath = path.startsWith("/teacher/dashboard");
  const isStudentPath = path.startsWith("/student/dashboard");
  if (!isTeacherPath && !isStudentPath) return NextResponse.next({ request });

  if (!url || !key) return NextResponse.redirect(new URL(isTeacherPath ? "/teacher/login" : "/student/login", request.url));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectWithCookies(request, response, isTeacherPath ? "/teacher/login" : "/student/login");

  if (isTeacherPath) {
    const { data: authorized, error } = await supabase.rpc("is_authorized_teacher");
    if (error || authorized !== true) return redirectWithCookies(request, response, "/teacher/login?error=unauthorized");
  } else {
    const { data: profile } = await supabase.from("profiles").select("role,access_status").eq("user_id", user.id).maybeSingle();
    if (profile?.role !== "student") return redirectWithCookies(request, response, "/student/login?error=unauthorized");
    if (profile.access_status !== "account_active") return redirectWithCookies(request, response, "/student/pending");
  }

  return response;
}

function redirectWithCookies(request: NextRequest, response: NextResponse, destination: string) {
  const redirect = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = { matcher: ["/teacher/dashboard/:path*", "/student/dashboard/:path*"] };