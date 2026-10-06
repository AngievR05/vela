"use client";

import { useEffect, useRef, useState } from "react";
import { applyBookMutation, bookMutationSchema, homeCacheKey, homeQueueKey, homeSnapshotSchema, libraryBookSchema, parseHomeQueue, parseHomeSnapshot, queueMutation } from "@/lib/home-data";

export default function useHome(userId) {
  const [snapshot, setSnapshot] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState([]);
  const [syncError, setSyncError] = useState("");
  const state = useRef({ snapshot: null, queue: [], blocked: false, active: false, revision: 0 });
  const loadRef = useRef(null);

  function publish(value) {
    state.current.snapshot = value;
    if (!state.current.active) return;
    setSnapshot(value);
    try { localStorage.setItem(homeCacheKey(userId), JSON.stringify(value)); } catch { /* Online reading remains available. */ }
  }
  function keepQueue(value, requireStorage = false) {
    try { localStorage.setItem(homeQueueKey(userId), JSON.stringify(value)); }
    catch { if (requireStorage) throw new Error("This browser can’t retain offline changes. Keep this form open and try again when online."); }
    state.current.queue = value;
    if (state.current.active) setQueue(value);
  }
  function expired() {
    try { localStorage.removeItem(homeCacheKey(userId)); localStorage.removeItem(homeQueueKey(userId)); } catch { /* The page is about to leave. */ }
    window.location.replace("/login?next=/home");
  }
  async function send(mutation) {
    const response = await fetch(`/api/library/${mutation.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mutation), signal: AbortSignal.timeout(15000),
    });
    if (response.status === 401) { expired(); throw new Error("Please log in to continue."); }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error || "We couldn’t save your update. Please try again.");
      error.status = response.status;
      throw error;
    }
    const parsed = libraryBookSchema.safeParse(body.book);
    if (!parsed.success || parsed.data.id !== mutation.id) throw new Error("We couldn’t confirm your saved update. Your input is still here; please try again.");
    return { book: parsed.data };
  }

  useEffect(() => {
    const current = state.current;
    current.active = true;
    let live = true;
    let syncing = false;
    let loading = false;
    async function sync(force = false) {
      if (!live || !current.active || syncing || !navigator.onLine || (current.blocked && !force)) return;
      syncing = true;
      if (force) current.blocked = false;
      try {
        while (live && current.active && current.queue.length && navigator.onLine) {
          const mutation = current.queue[0];
          await send(mutation);
          if (!live) return;
          // Keep updates added while this request was in flight.
          keepQueue(current.queue.filter((item) => item !== mutation));
          if (current.active) setSyncError("");
        }
      } catch (error) {
        if (!live) return;
        current.blocked = [404, 409].includes(error.status);
        if (live && current.active) setSyncError(`${error.message} Your unsynced updates remain on this device.`);
      } finally { syncing = false; }
    }
    async function load(showLoading = false) {
      if (!live || !current.active || loading) return;
      if (!navigator.onLine) { setOnline(false); setPhase("offline"); return; }
      loading = true;
      setOnline(true);
      if (showLoading || !current.snapshot) setPhase("loading");
      try {
        await sync(showLoading);
        if (!live || !current.active) return;
        const revision = current.revision;
        const response = await fetch("/api/home", { cache: "no-store", signal: AbortSignal.timeout(20000) });
        if (response.status === 401) { expired(); return; }
        if (!response.ok) throw new Error("Summary unavailable");
        const parsed = homeSnapshotSchema.safeParse(await response.json());
        if (!parsed.success || parsed.data.userId !== userId) throw new Error("Invalid reader summary");
        if (!live || !current.active) return;
        // A refresh started before a successful save must not roll back that save.
        if (revision !== current.revision) { setPhase(navigator.onLine ? "ready" : "offline"); return; }
        const merged = current.queue.reduce((value, mutation) => applyBookMutation(value, mutation), parsed.data);
        publish(merged);
        setPhase(navigator.onLine ? "ready" : "offline");
      } catch {
        if (live && current.active) setPhase(navigator.onLine ? "error" : "offline");
      } finally { loading = false; }
    }
    loadRef.current = load;
    async function init() {
      if (!live) return;
      try {
        const saved = parseHomeSnapshot(localStorage.getItem(homeCacheKey(userId)), userId);
        current.queue = parseHomeQueue(localStorage.getItem(homeQueueKey(userId)));
        if (!live || !current.active) return;
        setQueue(current.queue);
        if (saved) publish(saved);
      } catch { /* Restricted storage is optional for online use. */ }
      await load();
    }
    function offline() { setOnline(false); setPhase("offline"); }
    function resume() { if (document.visibilityState === "visible") load(); }
    Promise.resolve().then(init);
    window.addEventListener("online", resume);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", resume);
    const timer = window.setInterval(() => { if (current.queue.length && !current.blocked) load(); }, 15000);
    return () => {
      live = false;
      current.active = false;
      window.clearInterval(timer);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", resume);
    };
    // This effect owns the lifecycle of one verified reader's cache and queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function enqueue(mutation) {
    const value = state.current.snapshot;
    if (!value) throw new Error("Load your Library once while online before saving offline progress.");
    keepQueue(queueMutation(state.current.queue, mutation), true);
    state.current.revision += 1;
    publish(applyBookMutation(value, mutation));
    setPhase("offline");
    return { queued: true };
  }
  async function mutate(mutation) {
    const parsed = bookMutationSchema.safeParse(mutation);
    if (!parsed.success) throw new Error("Check your progress value.");
    if (!navigator.onLine) return enqueue(parsed.data);
    // Preserve the order of a queued start/progress pair before sending new progress.
    if (state.current.queue.length) {
      keepQueue(queueMutation(state.current.queue, parsed.data), true);
      state.current.revision += 1;
      publish(applyBookMutation(state.current.snapshot, parsed.data));
      await loadRef.current?.(true);
      return { queued: state.current.queue.length > 0 };
    }
    try {
      const result = await send(parsed.data);
      state.current.revision += 1;
      const value = state.current.snapshot;
      if (value) publish({ ...value, books: [...value.books.filter(book => book.id !== result.book.id), result.book] });
      setPhase("ready");
      return { queued: false, book: result.book };
    } catch (error) {
      if (!navigator.onLine) return enqueue(parsed.data);
      throw error;
    }
  }
  function removePending(mutation) {
    keepQueue(state.current.queue.filter((item) => item.id !== mutation.id || item.kind !== mutation.kind), true);
    state.current.revision += 1;
    state.current.blocked = false;
    setSyncError("");
    loadRef.current?.(true);
  }
  return { snapshot, phase, online, queue, syncError, mutate, removePending,
    refresh: () => loadRef.current?.(true), refreshQuietly: () => loadRef.current?.() };
}
