"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/redirect";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import TextField from "@/components/ui/TextField";
import PasswordField from "@/components/ui/PasswordField";

const labels = { login: "Log in", signup: "Create account", forgot: "Send reset link", reset: "Save password" };

export default function AuthForm({ mode, next, initialError = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setMessage("");
    if (mode === "reset" && password !== confirmation) {
      setError("Your passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const destination = safeNext(next);
      const callback = `${window.location.origin}/auth/callback`;
      let result;
      if (mode === "login") {
        result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      } else if (mode === "signup") {
        result = await supabase.auth.signUp({ email: email.trim(), password,
          options: { emailRedirectTo: `${callback}?next=${encodeURIComponent(destination)}` } });
      } else if (mode === "forgot") {
        result = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${callback}?next=/reset-password`,
        });
      } else {
        // Verify the recovery session before attempting a password change.
        const { data, error: sessionError } = await supabase.auth.getUser();
        if (sessionError || !data.user) {
          setError("Your reset link has expired. Request a new link to continue.");
          return;
        }
        result = await supabase.auth.updateUser({ password });
      }
      if (result.error) {
        const code = result.error.code;
        setError(result.error.name === "AuthRetryableFetchError" || result.error.status === 0
          ? "We could not connect. Check your connection and try again. Your input is still here."
          : code === "invalid_credentials" ? "Email or password is incorrect. Please try again."
          : code === "email_not_confirmed" ? "Confirm your email using the link in your inbox, then log in."
          : code === "over_email_send_rate_limit" || code === "over_request_rate_limit" ? "Too many attempts. Wait a moment, then try again."
          : result.error.message || "We could not complete that request. Please try again.");
        return;
      }
      if (mode === "forgot") {
        setMessage("If an account exists for this email, a reset link is on its way. Open it in this browser.");
      } else if (mode === "signup" && !result.data.session) {
        setPassword("");
        setMessage("Check your inbox to confirm your email, then log in. Open the confirmation link in this browser.");
      } else if (mode === "reset") {
        window.location.replace("/home?password=updated");
      } else {
        // A full navigation discards any cached content from a previous reader.
        window.location.replace(destination);
      }
    } catch {
      setError("We could not connect. Check your connection and try again. Your input is still here.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Card>
        <form className="stack" method="post" onSubmit={submit} aria-busy={pending}>
          {mode !== "reset" && <TextField label="Email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} readOnly={pending} />}
          {mode !== "forgot" && <PasswordField label={mode === "reset" ? "New password" : "Password"} name="password" required minLength={mode === "login" ? undefined : 8} autoComplete={mode === "login" ? "current-password" : "new-password"} helperText={mode === "login" ? "" : "Use 8 or more characters."} value={password} onChange={(event) => setPassword(event.target.value)} readOnly={pending} />}
          {mode === "reset" && <PasswordField label="Confirm new password" name="confirmation" autoComplete="new-password" helperText="" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} readOnly={pending} />}
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          <Button type="submit" loading={pending} width="fill">{labels[mode]}</Button>
        </form>
      </Card>
      {mode === "login" && <p><Link href="/forgot-password">Forgot password?</Link></p>}
      {mode === "reset" && <p><Link href="/forgot-password">Request a new reset link</Link></p>}
      <p className="muted">{mode === "login" ? <Link href={`/signup?next=${encodeURIComponent(safeNext(next))}`}>Create an account</Link> : <Link href={`/login?next=${encodeURIComponent(safeNext(next))}`}>Back to log in</Link>}</p>
    </>
  );
}
