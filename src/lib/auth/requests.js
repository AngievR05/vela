export function isTransientAuthError(error) {
  return Boolean(error && (error.name === "AuthRetryableFetchError" || error.status === 0 || error.status >= 500));
}

export function authErrorMessage(error) {
  if (isTransientAuthError(error)) return "We could not connect. Check your connection and try again. Your input is still here.";
  const messages = {
    invalid_credentials: "Email or password is incorrect. Please try again.",
    email_not_confirmed: "Confirm your email using the link in your inbox, then log in.",
    email_address_not_authorized: "Account emails are unavailable. Please try again later. Your input is still here.",
    email_provider_disabled: "Email sign-in is temporarily unavailable. Please try again later.",
    signup_disabled: "New accounts are temporarily unavailable. Please try again later.",
    over_email_send_rate_limit: "Too many attempts. Wait a moment, then try again.",
    over_request_rate_limit: "Too many attempts. Wait a moment, then try again.",
    session_expired: "Your reset link has expired. Request a new link to continue.",
  };
  return messages[error?.code] || error?.message || "We could not complete that request. Please try again.";
}

export async function performAuthRequest(auth, { mode, email, password, origin, destination }) {
  const callback = `${origin}/auth/callback`;
  if (mode === "login") return auth.signInWithPassword({ email: email.trim(), password });
  if (mode === "signup") return auth.signUp({ email: email.trim(), password,
    options: { emailRedirectTo: `${callback}?next=${encodeURIComponent(destination)}` } });
  if (mode === "forgot") return auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${callback}?next=/reset-password`,
  });
  if (mode === "reset") {
    const { data, error } = await auth.getUser();
    // A connection error must not invalidate an otherwise usable recovery link.
    if (error) return { error: isTransientAuthError(error) ? error : { code: "session_expired" } };
    if (!data?.user) return { error: { code: "session_expired" } };
    return auth.updateUser({ password });
  }
  throw new Error("Unsupported authentication request.");
}

export function sessionNeedsLogin(userId, event, session) {
  return event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !session)
    || Boolean(session && session.user.id !== userId);
}
