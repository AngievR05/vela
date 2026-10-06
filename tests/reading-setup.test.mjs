import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { readingSetupSchema, emptyPreferences, emptyPermissions, parseDraft, draftKey } from "../src/lib/reading-setup.js";

const choices = { genres: ["Fantasy", "Mystery"], storyElements: ["Found family"], pacing: "Steady", moods: ["Hopeful"] };
const payload = { preferences: choices, permissions: { ratings: true, dnf: false, history: true }, enabled: true };

test("setup validation rejects unknown, duplicate and inconsistent choices; drafts are reader-scoped", () => {
  assert.equal(readingSetupSchema.safeParse(payload).success, true);
  assert.equal(readingSetupSchema.safeParse({ preferences: emptyPreferences, permissions: emptyPermissions, enabled: false }).success, true);
  for (const bad of [
    { ...payload, userId: "another-reader" },
    { ...payload, preferences: { ...choices, genres: ["Fantasy", "Fantasy"] } },
    { ...payload, preferences: { ...choices, pacing: "Unknown" } },
    { ...payload, permissions: { ...payload.permissions, ratings: "true" } },
    { ...payload, enabled: false },
  ]) assert.equal(readingSetupSchema.safeParse(bad).success, false);
  assert.deepEqual(parseDraft(JSON.stringify(payload)), payload);
  assert.equal(parseDraft("not-json"), null);
  assert.equal(parseDraft(JSON.stringify({ ...payload, preferences: null })), null);
  assert.notEqual(draftKey("reader-a"), draftKey("reader-b"));
});

test("setup saves atomically under RLS, preserves other readers and learned evidence, and opts new readers out", async () => {
  const db = new PGlite();
  const a = "abd563cb-fdcc-4208-9e62-e1457a9df95e";
  const b = "dce88169-75db-43ef-8682-21949d0ab369";
  try {
    await db.exec(`create schema auth; create schema extensions; create role anon; create role authenticated;
      grant usage on schema auth to anon, authenticated;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
      $$ select (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid $$;`);
    for (const file of ["202609220001_initial_schema_rls.sql", "202610060001_reading_setup.sql"]) {
      const migration = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8");
      await db.exec(migration.replace("create extension if not exists pgcrypto with schema extensions;", ""));
    }
    await db.exec(`insert into auth.users(id) values ('${a}'), ('${b}');`);
    const defaults = (await db.query("select personalisation_enabled, use_recent_ratings, use_dnf_reasons, use_recent_history from public.ai_settings")).rows;
    defaults.forEach((row) => Object.values(row).forEach((value) => assert.equal(value, false)));
    await db.exec(`insert into public.reading_dna_signals(user_id, category, label, source_type, internal_weight)
      values ('${a}', 'genre', 'Fantasy', 'rating', 0.8);`);
    const rpc = (preferences, permissions = payload.permissions, enabled = true) => db.query(
      "select public.save_reading_setup($1::jsonb, $2::jsonb, $3::boolean)", [JSON.stringify(preferences), JSON.stringify(permissions), enabled]);
    await db.exec(`select set_config('request.jwt.claims', '{"sub":"${a}"}', false); set role authenticated;`);
    await rpc(choices);
    const saved = (await db.query("select reading_setup_preferences, reading_setup_completed_at from public.profiles")).rows;
    assert.equal(saved.length, 1);
    assert.deepEqual(saved[0].reading_setup_preferences, choices);
    assert.ok(saved[0].reading_setup_completed_at);
    assert.equal((await db.query("select use_recent_ratings from public.ai_settings")).rows[0].use_recent_ratings, true);
    assert.equal((await db.query("select * from public.reading_dna_signals where label = 'Fantasy'")).rows[0].source_type, "rating");
    for (const invalid of [
      { ...choices, pacing: "Invalid" }, { ...choices, genres: ["Fantasy", "Fantasy"] },
      { ...choices, moods: null }, { ...choices, user_id: b },
    ]) {
      await assert.rejects(rpc(invalid), (error) => error.code === "22023");
      assert.deepEqual((await db.query("select reading_setup_preferences from public.profiles")).rows[0].reading_setup_preferences, choices);
    }
    await assert.rejects(rpc(choices, { ratings: null, dnf: false, history: false }), (error) => error.code === "22023");
    await assert.rejects(rpc(choices, payload.permissions, false), (error) => error.code === "22023");
    await rpc({ ...emptyPreferences, genres: ["Romance"] });
    const signals = (await db.query("select label, active, source_type from public.reading_dna_signals")).rows;
    assert.equal(signals.find((row) => row.label === "Fantasy").active, true);
    assert.equal(signals.find((row) => row.label === "Mystery").active, false);
    assert.equal(signals.find((row) => row.label === "Romance").active, true);
    await rpc(choices);
    assert.equal((await db.query("select count(*)::integer as count from public.reading_dna_signals where label = 'Mystery'")).rows[0].count, 1);
    assert.equal((await db.query("select active from public.reading_dna_signals where label = 'Mystery'")).rows[0].active, true);
    await rpc(choices, emptyPermissions, false);
    assert.equal((await db.query("select personalisation_enabled from public.ai_settings")).rows[0].personalisation_enabled, false);
    // B sees only B and cannot alter A, including newly added profile fields.
    await db.exec(`reset role; select set_config('request.jwt.claims', '{"sub":"${b}"}', false); set role authenticated;`);
    assert.deepEqual((await db.query("select reading_setup_preferences from public.profiles")).rows[0].reading_setup_preferences, emptyPreferences);
    assert.equal((await db.query(`update public.profiles set reading_setup_preferences = '{}' where id = '${a}' returning id`)).rows.length, 0);
    assert.equal((await db.query("select count(*)::integer as count from public.reading_dna_signals")).rows[0].count, 0);
    await rpc({ ...emptyPreferences, pacing: "Relentless" }, emptyPermissions, true);
    await db.exec(`reset role; select set_config('request.jwt.claims', '{"sub":"${a}"}', false); set role authenticated;`);
    assert.deepEqual((await db.query("select reading_setup_preferences from public.profiles")).rows[0].reading_setup_preferences, choices);
    // Force a late failure to prove profile writes roll back with settings/signal writes.
    await db.exec(`reset role; delete from public.ai_settings where user_id = '${a}'; set role authenticated;`);
    await assert.rejects(rpc(emptyPreferences), (error) => error.code === "42501");
    assert.deepEqual((await db.query("select reading_setup_preferences from public.profiles")).rows[0].reading_setup_preferences, choices);
    await db.exec("reset role; select set_config('request.jwt.claims', '{}', false); set role anon;");
    await assert.rejects(rpc(choices), (error) => error.code === "42501");
    await db.exec("reset role; set role authenticated;");
    await assert.rejects(rpc(choices), (error) => error.code === "42501");
  } finally { await db.close(); }
});
