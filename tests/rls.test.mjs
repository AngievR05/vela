import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Real PostgreSQL execution in memory. Emulate only Supabase's auth schema/roles;
// apply the application's actual migration, triggers, grants, policies and FKs.
test("reader isolation across all private tables", async () => {
  const db = new PGlite();
  let checks = 0;
  try {
    await db.exec(`
      create schema auth; create schema extensions;
      create role anon; create role authenticated;
      grant usage on schema auth to anon, authenticated;
      create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$ select (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid $$;
    `);
    const migration = await readFile(new URL("../supabase/migrations/202609220001_initial_schema_rls.sql", import.meta.url), "utf8");
    // gen_random_uuid() is built into PostgreSQL; the unused pgcrypto extension
    // is not bundled with PGlite. All application SQL is otherwise unchanged.
    await db.exec(migration.replace("create extension if not exists pgcrypto with schema extensions;", ""));
    const a = "abd563cb-fdcc-4208-9e62-e1457a9df95e";
    const b = "dce88169-75db-43ef-8682-21949d0ab369";
    await db.exec(`insert into auth.users(id) values ('${a}'), ('${b}');`);
    const manual = await readFile(new URL("../supabase/tests/rls_boundary_manual.sql", import.meta.url), "utf8");
    const results = await db.exec(manual);
    const rows = results.flatMap((result) => result.rows ?? []).filter((row) => "pass" in row);
    assert.ok(rows.length > 15, "manual boundary checks executed");
    rows.forEach((row) => assert.equal(row.pass, true, row.test));
    checks += rows.length;

    // Reuse fixture seeding, then test every table in both directions.
    await db.exec(manual.slice(0, manual.indexOf("-- Simulate authenticated USER A.")));
    const tables = ["profiles", "user_books", "reading_dna_signals", "recommendation_sessions", "recommendations", "recommendation_feedback", "ai_settings"];
    const fixtures = {};
    for (const table of tables) fixtures[table] = (await db.query(`select * from public.${table}`)).rows;
    const spareBook = (await db.query(`insert into public.books(google_books_id, title) values ('rls-spare-book', 'Spare book') returning id`)).rows[0].id;
    async function blocked(sql, expectedCode = "42501") {
      await db.exec("savepoint denied");
      try {
        await assert.rejects(db.exec(sql), (error) => error.code === expectedCode);
        checks++;
      } finally {
        await db.exec("rollback to savepoint denied; release savepoint denied");
      }
    }
    for (const [own, other] of [[a, b], [b, a]]) {
      await db.exec(`select set_config('request.jwt.claims', '{"sub":"${own}","role":"authenticated"}', true); set local role authenticated;`);
      for (const table of tables) {
        const key = table === "profiles" ? "id" : "user_id";
        const visible = await db.query(`select ${key} as owner from public.${table}`);
        assert.equal(visible.rows.length, 1, `${table}: own row visible`);
        assert.equal(visible.rows[0].owner, own, `${table}: other reader hidden`);
        checks += 2;
        if (table !== "recommendations") {
          const result = await db.query(`update public.${table} set ${key} = ${key} where ${key} = '${other}' returning ${key}`);
          assert.equal(result.rows.length, 0, `${table}: cannot update other reader`);
          checks++;
          await blocked(`update public.${table} set ${key} = '${other}' where ${key} = '${own}'`);
          assert.equal((await db.query(`update public.${table} set ${key} = ${key} where ${key} = '${own}' returning ${key}`)).rows.length, 1, `${table}: own update allowed`);
          checks++;
        }
        if (!["profiles", "ai_settings", "recommendations"].includes(table)) {
          assert.equal((await db.query(`delete from public.${table} where ${key} = '${other}' returning ${key}`)).rows.length, 0, `${table}: cannot delete other reader`);
          checks++;
        }
        if (!["profiles", "ai_settings"].includes(table)) {
          const row = { ...fixtures[table].find((row) => row.user_id === other), id: "11111111-1111-4111-8111-111111111111" };
          const json = JSON.stringify(row).replaceAll("'", "''");
          await blocked(`insert into public.${table} select * from jsonb_populate_record(null::public.${table}, '${json}'::jsonb)`);
        }
      }
      // An owned child cannot reference another reader's recommendation session.
      const foreignSession = fixtures.recommendation_sessions.find((row) => row.user_id === other).id;
      await blocked(`insert into public.recommendations(user_id, session_id, book_id, rank, reason, confidence_label) values ('${own}', '${foreignSession}', '${spareBook}', 2, 'test', 'good_match')`, "23503");
      const foreignRecommendation = fixtures.recommendations.find((row) => row.user_id === other).id;
      // Remove competing unique rows in a savepoint, so a uniqueness error
      // cannot accidentally masquerade as a successful ownership check.
      await db.exec("savepoint cross_reference; reset role; delete from public.recommendation_feedback; set local role authenticated;");
      await blocked(`insert into public.recommendation_feedback(user_id, recommendation_id, feedback) values ('${own}', '${foreignRecommendation}', 'helpful')`, "23503");
      const ownRecommendation = fixtures.recommendations.find((row) => row.user_id === own).id;
      const foreignSignal = fixtures.reading_dna_signals.find((row) => row.user_id === other).id;
      await blocked(`insert into public.recommendation_feedback(user_id, recommendation_id, feedback, corrected_signal_id) values ('${own}', '${ownRecommendation}', 'not_for_me', '${foreignSignal}')`, "23503");
      await db.exec("rollback to savepoint cross_reference; release savepoint cross_reference");
      await db.exec("reset role");
    }
    await db.exec(`select set_config('request.jwt.claims', '{}', true); set local role anon;`);
    for (const table of [...tables, "books"]) {
      await blocked(`select * from public.${table}`);
      await blocked(`delete from public.${table}`);
    }
    await db.exec("reset role; rollback");
    console.log(`Verified ${checks} RLS assertions with PostgreSQL.`);
  } finally {
    await db.close();
  }
});
