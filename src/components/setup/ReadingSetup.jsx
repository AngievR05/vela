"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import AuthScreen, { BrandLogo } from "@/components/auth/AuthScreen";
import Button from "@/components/ui/Button";
import PreferenceChip from "@/components/ui/PreferenceChip";
import Toggle from "@/components/ui/Toggle";
import Card from "@/components/ui/Card";
import InlineAlert from "@/components/ui/InlineAlert";
import OnboardingStepIndicator from "@/components/ui/OnboardingStepIndicator";
import { draftKey, parseDraft, setupChoices, emptyPermissions } from "@/lib/reading-setup";
import styles from "./ReadingSetup.module.css";

const steps = [
  { key: "genres", title: "Which shelves pull you in?", description: "Choose at least one genre, or skip this optional step.", noteTitle: "Why we ask", note: "Genres shape your starting filters, not a permanent profile.", save: "Save genres", tone: "purple", folio: "B.02", selectedFolio: "B.03" },
  { key: "storyElements", title: "What makes a story stay with you?", description: "Choose the elements you notice first.", noteTitle: "Keep it human", note: "These signals help explain recommendations in plain language.", save: "Save story elements", tone: "brass", folio: "B.04", selectedFolio: "B.05" },
  { key: "pacing", title: "How should a book move?", description: "Pick the pace that feels easiest to return to.", noteTitle: "Your preferred pace", note: "Choose one pace, or skip if it depends on the book.", save: "Save pacing", tone: "green", folio: "B.06" },
  { key: "moods", title: "How do you want reading to feel?", description: "Mood can change. Choose what fits right now.", noteTitle: "For this moment", note: "You can change your reading mood whenever you like.", save: "Save reading mood", tone: "rose", folio: "B.07" },
];
const permissionCopy = [
  ["ratings", "Use my ratings", "Improve suggestions using ratings I add."],
  ["dnf", "Use my DNF reasons", "Learn from reasons I choose when I stop reading."],
  ["history", "Use my reading history", "Notice patterns across books I log."],
];
const reviewLabels = ["Genres", "Story elements", "Pacing", "Reading mood"];

function SetupActions({ primary, onPrimary, secondary, onSecondary, disabled, pending, primaryDisabled = false }) {
  return <div className={styles.actions}>
    <Button className={styles.button} onClick={onPrimary} loading={pending} disabled={disabled || primaryDisabled}>{pending ? "Saving your setup…" : primary}</Button>
    {secondary && <Button className={`${styles.button} ${styles.tertiary}`} variant="tertiary" onClick={onSecondary} disabled={disabled}>{secondary}</Button>}
  </div>;
}

export default function ReadingSetup({ userId, initial }) {
  const [draft, setDraft] = useState({ preferences: initial.preferences, permissions: initial.permissions, enabled: initial.enabled });
  const [stage, setStage] = useState(initial.completed ? "review" : "intro");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [learnMore, setLearnMore] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef(null);
  const inFlight = useRef(false);
  const retryPayload = useRef(null);
  const key = draftKey(userId);

  useEffect(() => {
    let cancelled = false;
    // Restore after hydration, so server and first client render agree.
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const saved = parseDraft(sessionStorage.getItem(key));
        if (saved) setDraft(saved);
      } catch { /* Storage restrictions do not prevent setup. */ }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [key]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [stage]);

  function update(next) {
    setDraft(next);
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep the draft in memory. */ }
  }
  function move(next) { setStage(next); window.scrollTo({ top: 0 }); }
  function select(choice, step) {
    const current = draft.preferences[step.key];
    const value = step.key === "pacing" ? (current === choice ? "" : choice)
      : current.includes(choice) ? current.filter((item) => item !== choice) : [...current, choice];
    update({ ...draft, preferences: { ...draft.preferences, [step.key]: value } });
  }
  function advance(index, skip = false) {
    if (skip) update({ ...draft, preferences: { ...draft.preferences, [steps[index].key]: index === 2 ? "" : [] } });
    move(editing ? "review" : index < 3 ? index + 1 : "ai");
    setEditing(false);
  }
  function edit(index) { setEditing(true); move(index); }
  function back() {
    if (editing) { setEditing(false); move("review"); }
    else if (typeof stage === "number") move(stage === 0 ? "intro" : stage - 1);
    else move({ ai: 3, permissions: "ai", review: "permissions", skip: "intro", error: "review" }[stage] ?? "intro");
  }
  async function save(payload) {
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    retryPayload.current = payload;
    update(payload);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/reading-setup", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 401) {
        window.location.replace("/login?next=/setup");
        return;
      }
      if (!response.ok) throw new Error("save_failed");
      const result = await response.json();
      if (!result.saved) throw new Error("save_failed");
      try { sessionStorage.removeItem(key); } catch { /* A successful save is already persisted in Supabase. */ }
      if (payload.enabled) move("created");
      else window.location.replace("/home");
    } catch {
      setError("Your choices have been preserved. Check your connection and try again.");
      move("error");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const step = typeof stage === "number" ? steps[stage] : null;
  const selected = step ? draft.preferences[step.key] : [];
  const count = typeof selected === "string" ? Number(Boolean(selected)) : selected.length;
  const tone = step?.tone ?? (stage === "error" || stage === "created" || stage === "skip" ? "green" : "purple");
  const folio = step ? count && step.selectedFolio ? step.selectedFolio : step.folio
    : { intro: "B.01", ai: "B.08", permissions: Object.values(draft.permissions).some(Boolean) ? "B.10" : "B.09", review: "B.11", created: "B.12", skip: "B.13", error: "B.14" }[stage];
  const chapter = step ? "READING DNA" : { ai: "PERSONALISATION", permissions: "YOUR DATA CHOICES", review: "REVIEW YOUR SETUP", created: "READING DNA CREATED", skip: "PERSONALISATION CHOICE", error: "SETUP NOT SAVED" }[stage];
  const disabled = pending || !ready;
  const title = (text) => <h1 className={styles.heading} ref={heading} tabIndex={-1}>{text}</h1>;
  const description = (text) => <p className={styles.description}>{text}</p>;

  return <AuthScreen tone={tone} folio={folio} artDirectory="setup" decoration="spark" className={`${styles.screen} ${styles[tone]}`}>
    {stage !== "intro" && <nav className={styles.navigation} aria-label="Reading setup navigation">
      {stage !== "created" ? <button type="button" className={styles.back} aria-label="Back" onClick={back} disabled={disabled}>
        <Image src="/setup/back.svg" width={24} height={24} alt="" unoptimized />
      </button> : <span />}
      <p>{chapter}</p>
    </nav>}
    {(step || stage === "ai") && <OnboardingStepIndicator current={step ? stage + 1 : 5} total={5} trailingLabel="Nothing is permanent" className={styles.progress} />}
    {stage === "intro" && <>
      <BrandLogo size={88} className={styles.logo} />
      <p className={styles.kicker}>YOUR READING DNA</p>
      {title("Let’s start with what you already know you enjoy.")}
      {description("A few quick choices help Vela organise your taste without boxing you in.")}
      <div className={styles.benefits}>{[["GENRES", "Start broad"], ["STORY", "Choose signals"], ["MOOD", "Tune the moment"]].map(([label, copy], index) =>
        <div className={styles.benefit} key={label}><span>{`0${index + 1}`}</span><strong>{label}</strong><p>{copy}</p></div>)}</div>
      <InlineAlert className={styles.response}>Nothing here is permanent. You can change these choices later.</InlineAlert>
      <SetupActions primary="Choose genres" onPrimary={() => move(0)} secondary="Set up later" onSecondary={() => move("skip")} disabled={disabled} pending={pending} />
    </>}
    {step && <>
      {title(step.title)}
      {description(count && stage === 1 ? "A small set creates clearer recommendations." : step.description)}
      <div className={styles.choices} role="group" aria-label={step.title}>
        {setupChoices[step.key].map((choice) => <PreferenceChip key={choice} className={styles.chip}
          selected={typeof selected === "string" ? selected === choice : selected.includes(choice)}
          disabled={disabled} onClick={() => select(choice, step)}>{choice}</PreferenceChip>)}
      </div>
      {count ? <InlineAlert type="success" className={`${styles.response} ${styles.success}`}>{count} {stage === 0 ? "genres" : count === 1 ? "choice" : "choices"} selected. Tap again to remove.</InlineAlert>
        : <Card className={`${styles.note} ${styles.softGreen}`}><strong>{step.noteTitle}</strong><p>{step.note}</p></Card>}
      <SetupActions primary={step.save} onPrimary={() => advance(stage)} secondary="Skip for now" onSecondary={() => advance(stage, true)} primaryDisabled={!count} disabled={disabled} pending={pending} />
    </>}
    {stage === "ai" && <>
      {title("How Vela personalises recommendations")}
      {description("Vela combines only the reading signals you allow, then shows why each suggestion appears.")}
      <Card className={styles.aiCard}>
        <span className={styles.disclosure}><BrandLogo size={18} /> <span aria-hidden="true">✦</span> VELA AI · EXPLAINABLE</span>
        <h2>You choose the signals.</h2><p>Ratings, DNF reasons and reading history are separate choices. Turn any signal off without losing your Library.</p>
        {["You choose", "Vela explains", "You can correct"].map((text, index) => <div className={styles.principle} key={text}><span>{index + 1}</span><i aria-hidden="true" /><p>{text}</p></div>)}
      </Card>
      {learnMore && <Card className={styles.note} id="personalisation-details"><strong>Your choices, explained</strong><p>Your selected genres, story elements, pace and mood create your starting DNA. Ratings, DNF reasons and reading history are used only when you enable each one. You can edit your choices or pause personalisation from Settings. Creating this profile doesn’t change your Library.</p></Card>}
      <div className={styles.actions}>
        <Button className={styles.button} disabled={disabled} onClick={() => move("permissions")}>Review data choices</Button>
        <Button variant="tertiary" className={`${styles.button} ${styles.tertiary}`} disabled={disabled} onClick={() => setLearnMore(!learnMore)} aria-expanded={learnMore} aria-controls="personalisation-details">{learnMore ? "Show less" : "Learn more"}</Button>
      </div>
    </>}
    {stage === "permissions" && <>
      {title("Choose what Vela can learn from.")}
      {description("Every signal is optional. Your Library still works with everything off.")}
      <div className={styles.permissions}>{permissionCopy.map(([name, label, copy]) => <Toggle key={name} className={styles.permission}
        label={`${label} — ${draft.permissions[name] ? "On" : "Off"}`} description={copy} checked={draft.permissions[name]} disabled={disabled}
        onChange={(event) => update({ ...draft, permissions: { ...draft.permissions, [name]: event.target.checked }, enabled: true })} />)}</div>
      <InlineAlert className={styles.response}>{Object.values(draft.permissions).some(Boolean) ? "Only the signals you selected will be used." : "No optional personalisation is selected."}</InlineAlert>
      <SetupActions primary="Review my choices" onPrimary={() => { setEditing(false); move("review"); }} disabled={disabled} pending={pending} />
    </>}
    {stage === "review" && <>
      {title("Review your reading starting point.")}
      {description("Check each choice before Vela creates your first Reading DNA.")}
      <div className={styles.review}>{steps.map((item, index) => <Card className={styles.reviewCard} key={item.key}>
        <div><strong>{reviewLabels[index]}</strong><p>{Array.isArray(draft.preferences[item.key]) ? draft.preferences[item.key].join(", ") || "Skipped" : draft.preferences[item.key] || "Skipped"}</p></div>
        <Button variant="tertiary" className={styles.edit} aria-label={`Edit ${reviewLabels[index].toLowerCase()}`} onClick={() => edit(index)} disabled={disabled}>Edit</Button>
      </Card>)}</div>
      <div className={styles.permissionReview}><p>Optional signals: {permissionCopy.filter(([name]) => draft.permissions[name]).map(([, label]) => label.replace("Use my ", "")).join(", ") || "all off"}</p><Button variant="tertiary" className={styles.edit} aria-label="Edit data permissions" onClick={() => { setEditing(true); move("permissions"); }} disabled={disabled}>Edit</Button></div>
      <SetupActions primary="Create my Reading DNA" onPrimary={() => save({ ...draft, enabled: true })} disabled={disabled} pending={pending} />
      {initial.completed && <Button variant="tertiary" className={styles.pause} disabled={disabled} onClick={() => move("skip")}>Pause personalisation</Button>}
    </>}
    {stage === "created" && <>
      {title("Your first Reading DNA is ready.")}
      {description("It is a starting point that changes as you read, review and correct it.")}
      <Card className={`${styles.detailCard} ${styles.softGreen}`}><h2>A starting point, not a verdict.</h2><p>{[
        draft.preferences.storyElements.length ? `Story elements: ${draft.preferences.storyElements.join(", ")}.` : "",
        draft.preferences.moods.length ? `Reading mood: ${draft.preferences.moods.join(", ")}.` : "",
        draft.preferences.pacing ? `Preferred pace: ${draft.preferences.pacing.toLowerCase()}.` : "",
      ].filter(Boolean).join(" ") || (draft.preferences.genres.length ? `Your starting genres: ${draft.preferences.genres.join(", ")}.` : "You skipped the taste choices. Add them any time from Settings.")}</p></Card>
      <Card className={`${styles.detailCard} ${styles.softPurple}`}><h2>You stay in control.</h2><p>Edit or pause personalisation at any time. Nothing here is permanent.</p></Card>
      <SetupActions primary="Go to Home" onPrimary={() => window.location.replace("/home")} disabled={disabled} pending={pending} />
    </>}
    {stage === "skip" && <>
      {title("Continue without personalisation?")}
      {description("Your Library and reading tracker will still work normally.")}
      <Card className={`${styles.detailCard} ${styles.softGreen}`}><h2>What changes</h2><p>Discover will not create personalised recommendations, and Reading DNA stays off until you enable it.</p></Card>
      <Card className={`${styles.detailCard} ${styles.softPurple}`}><h2>You can change this later.</h2><p>Turn personalisation on from Settings whenever you are ready.</p></Card>
      <SetupActions primary="Keep personalisation off" onPrimary={() => save({ ...draft, permissions: emptyPermissions, enabled: false })} secondary="Go back to setup" onSecondary={() => move(initial.completed ? "review" : "intro")} disabled={disabled} pending={pending} />
    </>}
    {stage === "error" && <>
      {title("We couldn’t save your setup.")}
      {description("Your choices are still here. Check your connection and try again.")}
      <Card className={`${styles.detailCard} ${styles.error}`} role="alert"><h2>Nothing was lost</h2><p>{error}</p></Card>
      <SetupActions primary="Try again" onPrimary={() => save(retryPayload.current ?? draft)} secondary="Review my choices" onSecondary={() => move("review")} disabled={disabled} pending={pending} />
    </>}
  </AuthScreen>;
}
