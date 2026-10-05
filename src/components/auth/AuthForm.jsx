"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/redirect";
import { authErrorMessage, performAuthRequest } from "@/lib/auth/requests";
import { validateAuthInput } from "@/lib/auth/validation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import TextField from "@/components/ui/TextField";
import PasswordField from "@/components/ui/PasswordField";
import InlineAlert from "@/components/ui/InlineAlert";
import AuthScreen, { AuthHeading, AuthNavigation } from "./AuthScreen";
import AuthStatus from "./AuthStatus";
import LogoutButton from "./LogoutButton";
import styles from "./Auth.module.css";

const copy = {
  signup: { chapter: "CREATE ACCOUNT", kicker: "CHAPTER ONE", description: "Only email and a password are required. You can change your choices later.", label: "Create account", loading: "Creating account…", tone: "plum", folio: "A.06" },
  login: { chapter: "LOG IN", kicker: "RETURN TO YOUR SHELF", description: "Log in to continue with your saved Library and preferences.", label: "Log in", loading: "Logging in…", tone: "green", folio: "A.12" },
  forgot: { chapter: "PASSWORD RECOVERY", kicker: "A GENTLE RESET", description: "Enter the email used for Vela. We’ll send a secure reset link.", label: "Send reset link", loading: "Sending link…", tone: "brass", folio: "A.18" },
  reset: { chapter: "SECURE RESET", kicker: "A NEW CHAPTER", description: "Use at least 8 characters. Your existing Library will stay exactly as it is.", label: "Update password", loading: "Updating password…", tone: "plum", folio: "A.22" },
};

export default function AuthForm({ mode, next, initialError = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState(initialError);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState("");
  const inFlight = useRef(false);
  const config = copy[mode];
  const destination = safeNext(next);
  const hasInput = mode === "reset" ? Boolean(password && confirmation)
    : Boolean(email.trim() && (mode === "forgot" || password));

  function change(setter, field, value) {
    setter(value);
    setError("");
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
      // Credential errors concern the pair; either edit can correct them.
      ...(mode === "login" ? { email: undefined, password: undefined } : {}),
      ...(mode === "reset" && field === "password" ? { confirmation: undefined } : {}),
    }));
  }

  async function submit(event) {
    event?.preventDefault();
    if (inFlight.current || (completed && mode !== "forgot")) return;
    setError("");
    const errors = validateAuthInput({ mode, email, password, confirmation });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError(errors.email ? `${errors.email}${password ? " Your password has been preserved." : ""}` : "Check the highlighted fields. Your entries are preserved.");
      event?.currentTarget?.elements?.namedItem(Object.keys(errors)[0])?.focus();
      return;
    }
    inFlight.current = true;
    setPending(true);
    try {
      const result = await performAuthRequest(createClient().auth, {
        mode, email, password, destination, origin: window.location.origin,
      });
      if (result.error) {
        const message = authErrorMessage(result.error);
        if (result.error.code === "invalid_credentials") {
          setFieldErrors({ password: "Email or password is incorrect. Try again or reset your password." });
        } else {
          if (["weak_password", "same_password"].includes(result.error.code)) setFieldErrors({ password: message });
          setError(message);
        }
        return;
      }
      if (mode === "forgot") {
        setCompleted("forgot");
      } else if (mode === "signup") {
        setPassword("");
        setCompleted(result.data.session ? "signup" : "confirmation");
      } else if (mode === "reset") {
        setPassword("");
        setConfirmation("");
        setCompleted("reset");
      } else {
        // Discard cached pages from any previous reader after login.
        window.location.replace(destination);
      }
    } catch {
      setError("We could not connect. Check your connection and try again. Your input is still here.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (completed === "forgot") return <AuthStatus tone="brass" folio="A.21" logoSize={106}
    title="Check your inbox." description={`If an account exists for ${email.trim()}, a secure reset link is on its way. Open it in the browser where you requested it.`}
    message="If the email does not arrive, check spam or send it again.">
    {error && <InlineAlert type="error" className={styles.response}>{error}</InlineAlert>}
    <Button href={`/login?next=${encodeURIComponent(destination)}`} className={styles.button}>Return to log in</Button>
    <Button onClick={submit} loading={pending} variant="secondary" className={`${styles.button} ${styles.secondary}`}>{pending ? "Sending link…" : "Send again"}</Button>
  </AuthStatus>;

  if (completed === "confirmation") return <AuthStatus tone="green" folio="A.11"
    title="Check your inbox." description="Confirm your email to open your private reading space. Use the link in your inbox in this browser."
    message="Your reading choices remain editable. Personalisation is optional.">
    <Button href={`/login?next=${encodeURIComponent(destination)}`} className={styles.button}>Return to log in</Button>
  </AuthStatus>;

  if (completed === "signup") return <AuthStatus tone="green" folio="A.11"
    title="Your reading space is ready." description="Next, choose a few things you already know you enjoy."
    message="Account created. Your choices remain editable.">
    <Button onClick={() => window.location.replace(next ? destination : "/dna")} className={styles.button}>{next ? "Continue to Vela" : "Set up Reading DNA"}</Button>
  </AuthStatus>;

  if (completed === "reset") return <AuthStatus tone="green" folio="A.25"
    title="Password updated." description="Your account is secure and your Library is unchanged."
    message="You can now continue with your new password.">
    <LogoutButton label="Return to log in" className={styles.button} variant="primary" />
  </AuthStatus>;

  const heading = mode === "signup" ? <>Create your <span className={styles.highlight}>reading</span> space.</>
    : mode === "login" ? <>Welcome <span className={styles.highlight}>back.</span></>
    : mode === "forgot" ? <>Find your <span className={styles.highlight}>account.</span></>
    : <>Choose a new <span className={styles.highlight}>password.</span></>;

  return <AuthScreen tone={mode === "login" && (error || fieldErrors.password) ? "muted" : config.tone} folio={config.folio}>
    <AuthNavigation label={config.chapter} href={mode === "forgot" ? `/login?next=${encodeURIComponent(destination)}` : mode === "reset" ? "/login" : "/welcome"}
      backLabel={mode === "forgot" || mode === "reset" ? "Back to log in" : "Back to welcome"} />
    <AuthHeading kicker={config.kicker} description={config.description}>{heading}</AuthHeading>
    <form className={styles.flow} method="post" noValidate onSubmit={submit} aria-busy={pending}>
      <Card className={styles.fields}>
        {mode !== "reset" && <TextField className={styles.field} label="Email" name="email" type="email" autoComplete="email"
          placeholder="Enter email" required maxLength={254} value={email} readOnly={pending} error={fieldErrors.email}
          onChange={(event) => change(setEmail, "email", event.target.value)} />}
        {mode !== "forgot" && <PasswordField className={styles.field} label={mode === "reset" ? "New password" : "Password"}
          name="password" placeholder={mode === "reset" ? "Enter new password" : "Enter password"} required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          helperText={mode === "login" ? "" : "Use 8 or more characters."} error={fieldErrors.password}
          value={password} readOnly={pending} onChange={(event) => change(setPassword, "password", event.target.value)} />}
        {mode === "reset" && <PasswordField className={styles.field} label="Confirm password" name="confirmation"
          placeholder="Enter confirm password" autoComplete="new-password" helperText="" error={fieldErrors.confirmation}
          required value={confirmation} readOnly={pending} onChange={(event) => change(setConfirmation, "confirmation", event.target.value)} />}
      </Card>
      {mode === "signup" && !error && <p className={styles.privacyNote}>Vela needs only your email and password to create your private reading space. Personalisation is optional.</p>}
      {error && <InlineAlert type="error" className={styles.response}>{error}</InlineAlert>}
      <div className={styles.actions}>
        <Button type="submit" loading={pending} disabled={!hasInput} className={styles.button}>{pending ? config.loading : config.label}</Button>
        {mode === "login" && <Button href={`/forgot-password?next=${encodeURIComponent(destination)}`} variant="tertiary" className={`${styles.button} ${styles.textButton}`}>Forgot password?</Button>}
        {mode === "signup" && <Button href={`/login?next=${encodeURIComponent(destination)}`} variant="tertiary" className={`${styles.button} ${styles.textButton}`}>Already have an account? Log in</Button>}
        {mode === "forgot" && <Button href={`/login?next=${encodeURIComponent(destination)}`} variant="tertiary" className={`${styles.button} ${styles.textButton}`}>Return to log in</Button>}
      </div>
    </form>
  </AuthScreen>;
}
