import AuthForm from "@/components/auth/AuthForm";
import AuthStatus from "@/components/auth/AuthStatus";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { isTransientAuthError } from "@/lib/auth/requests";
import styles from "@/components/auth/Auth.module.css";
import controlStyles from "@/components/ui/PrimitiveControls.module.css";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user && !error && params.error !== "link") return <AuthForm mode="reset" />;
  const unavailable = isTransientAuthError(error) && params.error !== "link";
  return <AuthStatus tone="plum" folio="A.22" warning
    title={unavailable ? "Let’s try that again." : "Request a new link."}
    description={unavailable ? "We could not verify your reset link. Check your connection and try again." : "Your reset link is invalid or has expired. Request another to choose a new password."}
    message="Your Library and reading preferences are unchanged.">
    {unavailable ? <a href="/reset-password" className={`${controlStyles.button} ${controlStyles.buttonPrimary} ${styles.button}`}>Try again</a>
      : <Button href="/forgot-password" className={styles.button}>Send a new reset link</Button>}
    <Button href="/login" variant="tertiary" className={`${styles.button} ${styles.textButton}`}>Return to log in</Button>
  </AuthStatus>;
}
