"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isTransientAuthError } from "@/lib/auth/requests";
import AuthScreen, { BrandLogo } from "./AuthScreen";
import AuthStatus from "./AuthStatus";
import Button from "@/components/ui/Button";
import styles from "./Auth.module.css";

export default function EntryExperience() {
  const router = useRouter();
  const [state, setState] = useState("splash");
  const [name, setName] = useState("");
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    let active = true;
    const current = ++generation.current;
    async function check() {
      setState("checking");
      try {
        if (!navigator.onLine) {
          if (active) setState("offline");
          return;
        }
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!active || current !== generation.current) return;
        if (isTransientAuthError(error)) { setState("unavailable"); return; }
        if (!user || error) { router.replace("/welcome"); return; }
        setState("returning");
        // This read uses the verified reader's client and is restricted by RLS.
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
        if (active && current === generation.current && profile?.display_name !== "Reader") setName(profile?.display_name || "");
      } catch {
        if (active && current === generation.current) setState(navigator.onLine ? "unavailable" : "offline");
      }
    }
    check();
    return () => { active = false; };
  }, [attempt, router]);

  if (state === "returning") return <AuthStatus tone="green" folio="A.03"
    title={name ? `Welcome back, ${name}.` : "Welcome back."} description="Your reading space is ready where you left it.">
    <Button onClick={() => window.location.replace("/home")} className={styles.button}>Continue to Home</Button>
  </AuthStatus>;

  if (state === "offline" || state === "unavailable") return <AuthStatus tone="muted" folio="A.04" logoSize={108}
    title={state === "offline" ? "You’re offline." : "Let’s try that again."}
    description="Reconnect to open your reading space. Your saved books and preferences won’t be changed."
    warning message="We couldn’t verify your session. Check your connection and try again.">
    <Button onClick={() => setAttempt((value) => value + 1)} className={styles.button}>Try again</Button>
    <Button href="/welcome" variant="tertiary" className={`${styles.button} ${styles.textButton}`}>Return to welcome</Button>
  </AuthStatus>;

  return <AuthScreen tone="brass" folio={state === "splash" ? "A.01" : "A.02"}>
    <div className={styles.statusBody}>
      <BrandLogo size={state === "splash" ? 128 : 112} />
      <h1 className={state === "splash" ? styles.brandName : styles.statusHeading}>{state === "splash" ? "VELA" : "Opening Vela…"}</h1>
      <p className={state === "splash" ? styles.splashCopy : styles.statusCopy}>{state === "splash" ? "Your reading life, intelligently organised." : "Checking your saved session and reading space."}</p>
    </div>
    {state === "splash" ? <p className={styles.splashFolio}>A READING COMPANION · EST. 2026</p>
      : <div className={styles.loadingTrack} role="status" aria-label="Checking your saved session" />}
  </AuthScreen>;
}
