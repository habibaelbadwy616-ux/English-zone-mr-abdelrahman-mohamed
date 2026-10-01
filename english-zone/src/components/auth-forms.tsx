"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, FileImage, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { StudentApprovalWaiting } from "@/components/student-approval-waiting";

type AuthMode = "student-login" | "teacher-login" | "student-register";

function PasswordField({ label, value, onChange, autoComplete, required = true }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string; required?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <label className="form-field"><span>{label}</span><div className="input-wrap"><LockKeyhole size={16} /><input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} minLength={8} /><button className="password-toggle" type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>;
}

function FormMessage({ error, success }: { error: string; success?: string }) {
  if (!error && !success) return null;
  return <p className={`form-message ${error ? "form-message-error" : "form-message-success"}`} role={error ? "alert" : "status"}>{error || success}</p>;
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const submitting = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loginMethod, setLoginMethod] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [stage, setStage] = useState("");
  const [educationalSystem, setEducationalSystem] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [created, setCreated] = useState(false);
  const [registrationHasSession, setRegistrationHasSession] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      if (!supabase) throw new Error("Authentication is not configured yet. Add the Supabase environment variables to continue.");

      if (mode === "teacher-login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw new Error("Email or password is incorrect.");
        const { data: authorized, error: authorizationError } = await supabase.rpc("is_authorized_teacher");
        if (authorizationError || authorized !== true) {
          await supabase.auth.signOut();
          throw new Error("This account is not authorized to access the teacher area.");
        }
        router.replace("/teacher/dashboard");
        return;
      }

      if (loginMethod === "email") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw new Error("Email or password is incorrect. Check your details and try again.");
      } else {
        const response = await fetch("/api/auth/access-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: accessCode.trim() }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "That access code could not be verified.");
        const { error: sessionError } = await supabase.auth.setSession(payload.session);
        if (sessionError) throw new Error("We could not start your session. Please try again.");
      }
      const nextPath = new URLSearchParams(window.location.search).get("next");
      const destination = nextPath?.startsWith("/student/") && !nextPath.startsWith("//")
        ? nextPath
        : "/student/dashboard";
      router.replace(destination);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (stage !== "3rd Preparatory" && !educationalSystem) {
      setError("Choose your educational system.");
      return;
    }
    if (avatar && avatar.size > 5 * 1024 * 1024) {
      setError("Choose a profile picture smaller than 5 MB.");
      return;
    }
    if (avatar && !["image/png", "image/jpeg", "image/webp"].includes(avatar.type)) {
      setError("Choose a JPG, PNG, or WebP image for your profile picture.");
      return;
    }
    if (submitting.current) return;
    submitting.current = true;

    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      if (!supabase) throw new Error("Account creation is not configured yet. Add the Supabase environment variables to continue.");
      const challengeAttemptId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("challenge") : null;
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone,
          guardianPhone,
          academicStage: stage,
          educationalSystem: educationalSystem || null,
          challengeAttemptId,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "We could not submit your account.");
      if (typeof result.userId !== "string") throw new Error("The account was created without a student profile.");

      let hasSession = false;
      if (result.session) {
        const { error: sessionError } = await supabase.auth.setSession(result.session);
        hasSession = !sessionError;
      }
      let imageNote = "";

      if (avatar && hasSession) {
        const extension = avatar.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${result.userId}/profile.${extension}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatar, { upsert: true, contentType: avatar.type });
        if (uploadError) imageNote = " You can add your profile picture after signing in.";
        else {
          const { data: image } = supabase.storage.from("avatars").getPublicUrl(path);
          await supabase.from("profiles").update({ profile_picture_url: image.publicUrl }).eq("user_id", result.userId);
        }
      } else if (avatar) {
        imageNote = " Add your profile picture after confirming your email.";
      }

      setSuccess(hasSession ? imageNote.trim() : `Confirm your email before signing in.${imageNote}`);
      setRegistrationHasSession(hasSession);
      setCreated(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not create your account. Please try again.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  if (created) {
    return <StudentApprovalWaiting hasSession={registrationHasSession} email={email} note={success} />;
  }

  if (mode === "student-register") {
    return <form className="auth-form registration-form" onSubmit={handleRegister}>
      <div className="form-grid-two">
        <label className="form-field"><span>Full name</span><div className="input-wrap"><UserRound size={16} /><input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder="Your full name" required minLength={2} /></div></label>
        <label className="form-field"><span>Phone number</span><div className="input-wrap"><input className="input-no-icon" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="01X XXX XXXX" required /></div></label>
        <label className="form-field"><span>Parent / guardian phone</span><div className="input-wrap"><input className="input-no-icon" type="tel" value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} placeholder="01X XXX XXXX" required /></div></label>
        <label className="form-field"><span>Academic stage</span><div className="input-wrap select-wrap"><select value={stage} onChange={(event) => { setStage(event.target.value); setEducationalSystem(""); }} required><option value="">Choose your stage</option><option>3rd Preparatory</option><option>1st Secondary</option><option>2nd Secondary</option><option>3rd Secondary</option></select></div></label>
        {stage && <label className="form-field"><span>Educational system {stage === "3rd Preparatory" && <small>optional for your stage</small>}</span><div className="input-wrap select-wrap"><select value={educationalSystem} onChange={(event) => setEducationalSystem(event.target.value)} required={stage !== "3rd Preparatory"}><option value="">{stage === "3rd Preparatory" ? "Not applicable" : "Choose a system"}</option><option value="general">General</option><option value="baccalaureate">Baccalaureate</option></select></div></label>}
        <label className="form-field"><span>Email address</span><div className="input-wrap"><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></div></label>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
      </div>
      <label className="avatar-upload"><span className="avatar-upload-icon"><FileImage size={18} /></span><span><strong>Profile picture <small>OPTIONAL</small></strong><small>{avatar ? avatar.name : "Choose a JPG, PNG or WebP image"}</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const nextAvatar = event.target.files?.[0] ?? null; setAvatar(nextAvatar); if (!nextAvatar || (["image/png", "image/jpeg", "image/webp"].includes(nextAvatar.type) && nextAvatar.size <= 5 * 1024 * 1024)) setError(""); }} /></label>
      <FormMessage error={error} />
      <button className="button auth-submit" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17} /> Creating your account…</> : <>Create student account <ArrowRight size={16} /></>}</button>
      <p className="form-footnote">By creating an account, you agree to use English Zone respectfully and keep your sign-in details private.</p>
      <p className="form-switch">Already learning with us? <Link href="/student/login">Student login</Link></p>
    </form>;
  }

  const isTeacher = mode === "teacher-login";
  return <form className="auth-form" onSubmit={handleLogin}>
    {!isTeacher && <div className="login-method-tabs" role="tablist" aria-label="Student login method"><button type="button" role="tab" aria-selected={loginMethod === "email"} className={loginMethod === "email" ? "active" : ""} onClick={() => { setLoginMethod("email"); setError(""); }}>Email & password</button><button type="button" role="tab" aria-selected={loginMethod === "code"} className={loginMethod === "code" ? "active" : ""} onClick={() => { setLoginMethod("code"); setError(""); }}>Access code</button></div>}
    {(isTeacher || loginMethod === "email") ? <>
      <label className="form-field"><span>Email address</span><div className="input-wrap"><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></div></label>
      <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
      {isTeacher && <div className="teacher-secure-hint"><ShieldCheck size={15} /><span>Secure teacher access. Only the authorized teacher account can continue.</span></div>}
    </> : <label className="form-field"><span>Student access code</span><div className="input-wrap"><ShieldCheck size={16} /><input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoCapitalize="characters" autoComplete="one-time-code" placeholder="Enter the code from your teacher" required minLength={6} /></div><small className="field-help">Use the personal access code provided by your teacher.</small></label>}
    <FormMessage error={error} />
    <button className="button auth-submit" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17} /> Signing you in…</> : <>{isTeacher ? "Sign in to teacher space" : "Sign in to your account"} <ArrowRight size={16} /></>}</button>
    {!isTeacher && <p className="form-switch">New to English Zone? <Link href="/student/register">Create a student account</Link></p>}
  </form>;
}