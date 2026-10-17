import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {PGlite} from "@electric-sql/pglite";

test("full migrated schema isolates every private table; reset preserves Library and deletion cascades only intended reader",async()=>{
 const db=new PGlite();let assertions=0;
 try{
  await db.exec(`create schema auth;create schema extensions;create role anon;create role authenticated;grant usage on schema auth to anon,authenticated;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid()returns uuid language sql stable as $$select(current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;create function auth.jwt()returns jsonb language sql stable as $$select current_setting('request.jwt.claims',true)::jsonb$$;`);
  for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())await db.exec((await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto with schema extensions;',''));
  const a=randomUUID(),b=randomUUID(),shared=randomUUID();await db.query('insert into auth.users(id)values($1),($2)',[a,b]);await db.query("insert into public.books(id,google_books_id,title,categories)values($1,'audit-shared','Shared facts',array['Fantasy'])",[shared]);
  const privateTables=['profiles','ai_settings','user_books','reading_dna_signals','recommendation_sessions','recommendations','recommendation_feedback','reader_book_stats','reading_dna_changes','reader_book_updates'];
  const visible=(await db.query("select tablename,rowsecurity from pg_tables where schemaname='public'")).rows;
  assert.deepEqual(visible.map(t=>t.tablename).sort(),[...privateTables,'books'].sort());assert.ok(visible.every(t=>t.rowsecurity));assertions+=2;
  for(const owner of [a,b]){
   const book=randomUUID(),entry=randomUUID(),signal=randomUUID(),session=randomUUID(),rec=randomUUID();
   await db.query("insert into public.books(id,google_books_id,title,created_by)values($1,$2,'Private manual facts',$3)",[book,'manual:'+randomUUID(),owner]);
   await db.query("insert into public.user_books(id,user_id,book_id,status,notes)values($1,$2,$3,'reading','PRIVATE NOTES')",[entry,owner,book]);
   await db.query("insert into public.reading_dna_signals(id,user_id,category,label,source_type)values($1,$2,'genre','Fantasy','onboarding')",[signal,owner]);
   await db.query("insert into public.recommendation_sessions(id,user_id,request_text)values($1,$2,'Private request')",[session,owner]);
   await db.query("insert into public.recommendations(id,user_id,session_id,book_id,rank,reason,confidence_label)values($1,$2,$3,$4,1,'A reason','good_match')",[rec,owner,session,book]);
   await db.query("insert into public.recommendation_feedback(user_id,recommendation_id,feedback)values($1,$2,'helpful')",[owner,rec]);
   await db.query("insert into public.reader_book_stats(id,user_id,primary_genre)values($1,$2,'Fantasy')",[entry,owner]);
   await db.query("insert into public.reading_dna_changes(id,user_id,signal_id,action)values($1,$2,$3,'keep')",[randomUUID(),owner,signal]);
   await db.query("insert into public.reader_book_updates(id,user_id,user_book_id,kind,request,before_state)values($1,$2,$3,'progress','{}','{}')",[randomUUID(),owner,entry]);
  }
  const role=async(owner,amr=[],kind='authenticated')=>db.exec(`reset role;select set_config('request.jwt.claims','${JSON.stringify(owner?{sub:owner,amr}:{})}',false);set role ${kind};`);
  for(const owner of [a,b]){await role(owner);for(const table of privateTables){const key=table==='profiles'?'id':'user_id';const rows=(await db.query(`select * from public.${table}`)).rows;assert.equal(rows.length,1,table+' own row');assert.ok(rows.every(r=>r[key]===owner));assertions+=2;const foreign=owner===a?b:a;try{const result=await db.query(`update public.${table} set ${key}=${key} where ${key}=$1 returning ${key}`,[foreign]);assert.equal(result.rows.length,0);}catch(e){assert.equal(e.code,'42501');}assertions++;try{const result=await db.query(`delete from public.${table} where ${key}=$1 returning ${key}`,[foreign]);assert.equal(result.rows.length,0);}catch(e){assert.equal(e.code,'42501');}assertions++;await assert.rejects(db.query(`update public.${table} set ${key}=$1 where ${key}=$2`,[foreign,owner]),e=>e.code==='42501');assertions++;}assert.equal((await db.query('select * from public.books')).rows.length,2);assertions++;}
  await role(null,[],'anon');for(const table of [...privateTables,'books']){await assert.rejects(db.query(`select * from public.${table}`),e=>e.code==='42501');assertions++;}
  await role(a);const libraryBefore=(await db.query('select * from public.user_books order by id')).rows;const settingsBefore=(await db.query('select * from public.ai_settings')).rows;
  await db.query('select public.reset_reading_dna($1)',[randomUUID()]);assert.deepEqual((await db.query('select * from public.user_books order by id')).rows,libraryBefore);assert.deepEqual((await db.query('select * from public.ai_settings')).rows,settingsBefore);assertions+=2;
  await assert.rejects(db.query("select public.delete_reader_account('DELETE')"),e=>e.code==='42501');assertions++;
  await role(a,[{method:'password',timestamp:Math.floor(Date.now()/1000)-1000}]);await assert.rejects(db.query("select public.delete_reader_account('DELETE')"),e=>e.code==='42501');assertions++;
  await role(b);const other={};for(const table of privateTables)other[table]=(await db.query(`select * from public.${table} order by ${table==='ai_settings'?'user_id':'id'}`)).rows;
  await role(a,[{method:'password',timestamp:Math.floor(Date.now()/1000)}]);await db.query("select public.delete_reader_account('DELETE')");await db.exec('reset role');
  assert.deepEqual((await db.query('select id from auth.users')).rows,[{id:b}]);assertions++;
  for(const table of privateTables){const key=table==='profiles'?'id':'user_id';assert.equal((await db.query(`select * from public.${table} where ${key}=$1`,[a])).rows.length,0);assertions++;}
  assert.equal((await db.query('select * from public.books where created_by=$1',[a])).rows.length,0);assert.equal((await db.query('select * from public.books where id=$1',[shared])).rows.length,1);assertions+=2;
  await role(b);for(const table of privateTables){assert.deepEqual((await db.query(`select * from public.${table} order by ${table==='ai_settings'?'user_id':'id'}`)).rows,other[table],table+' preserves second reader');assertions++;}
  console.log(`Verified ${assertions} full-schema privacy/reset/deletion audit assertions.`);
 }finally{await db.close();}
});
