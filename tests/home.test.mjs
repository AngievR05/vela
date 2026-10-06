import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { deriveHome, homeInsight, homeSnapshotSchema, parseHomeSnapshot, parseHomeQueue, homeCacheKey, homeQueueKey, queueMutation, applyBookMutation, bookMutationSchema, addBookSchema } from "../src/lib/home-data.js";
import { loadHome, mutateReaderBook, saveLibraryBook } from "../src/lib/reader-library.js";
const a = "abd563cb-fdcc-4208-9e62-e1457a9df95e";
const b = "dce88169-75db-43ef-8682-21949d0ab369";
const id = "08978c87-0a49-4382-9e32-801751323371";
const makeBook = (overrides = {}) => ({ id, bookId:b, googleBooksId:"Example", title:"Example", author:"Author", pageCount:100, coverSrc:null, status:"reading", progressPercent:20, rating:null, dnfUse:false, startedAt:null, finishedAt:null, updatedAt:"2026-10-01T12:00:00Z", ...overrides });
const snapshot = (books=[]) => ({version:1,userId:a,displayName:"Reader",fetchedAt:1,books,personalisationEnabled:true,signals:[]});

test("Home derives actual reader states and calendar-year statistics without inventing ratings",()=>{
 const date=new Date(2026,9,6);
 assert.equal(deriveHome(snapshot(),date).state,"new");
 assert.equal(deriveHome(snapshot([makeBook({status:"dnf"})]),date).state,"no-current");
 const data=snapshot([
  makeBook(),makeBook({id:a,updatedAt:"2026-10-02T12:00:00Z",rating:5}),
  makeBook({id:b,status:"finished",finishedAt:"2026-01-01",rating:3}),
  makeBook({id:"c16658fe-d9b7-4315-b84a-a62172aebc1b",status:"finished",finishedAt:"2025-12-31"}),
  makeBook({id:"34a2c4ef-99e6-4b81-b72f-3d5519647af4",status:"finished",finishedAt:"2026-12-31"}),
 ]);
 const result=deriveHome(data,date);
 assert.equal(result.current.id,a);assert.deepEqual(result.stats,{thisYear:1,reading:2,average:"4.0"});
 assert.equal(deriveHome(snapshot([makeBook()]),date).stats.average,"—");
 assert.equal(homeInsight(snapshot()).label,"YOUR READING DNA IS TAKING SHAPE");
 assert.equal(homeInsight({...snapshot(),personalisationEnabled:false}).label,"YOU STAY IN CONTROL");
});

test("offline snapshots and update queues reject malformed and cross-reader data; updates preserve dates",()=>{
 const data=snapshot([makeBook()]);
 assert.deepEqual(parseHomeSnapshot(JSON.stringify(data),a),data);
 assert.equal(parseHomeSnapshot(JSON.stringify(data),b),null);
 assert.equal(parseHomeSnapshot("bad-json",a),null);
 assert.equal(parseHomeSnapshot(JSON.stringify({...data,books:[{...makeBook(),progressPercent:101}]}),a),null);
 assert.notEqual(homeCacheKey(a),homeCacheKey(b));assert.notEqual(homeQueueKey(a),homeQueueKey(b));
 assert.deepEqual(parseHomeQueue('[{"kind":"progress","id":"wrong","percent":42}]'),[]);
 const start={kind:"start",id}; const progress={kind:"progress",id,percent:50};
 const queue=queueMutation(queueMutation([start],progress),{...progress,percent:80});
 assert.deepEqual(queue,[start,{...progress,percent:80}]);
 assert.deepEqual(queueMutation([progress],start),[start,progress]);
 const finished=applyBookMutation(data,{...progress,percent:100},"2026-10-06").books[0];
 assert.equal(finished.status,"finished");assert.equal(finished.finishedAt,"2026-10-06");assert.equal(finished.startedAt,"2026-10-06");
 for(const invalid of [{...progress,userId:b},{...progress,percent:1.5},{...progress,percent:-1},{...progress,percent:101},{...progress,percent:"30"}])assert.equal(bookMutationSchema.safeParse(invalid).success,false);
 assert.equal(addBookSchema.safeParse({googleBooksId:"Example",userId:b}).success,false);
 assert.equal(addBookSchema.safeParse({googleBooksId:"../book"}).success,false);
});

// A small PostgREST-shaped adapter executes the real data operations against
// PostgreSQL with the checked-in migrations and authenticated/anon roles.
function client(db){
 return {from(table){
  const q={table,filters:[],orders:[],offset:0,limit:null,operation:"read",columns:"*",one:false};
  const ident=s=>{assert.match(s,/^[a-z_]+$/);return '"'+s+'"';};
  const api={
   select(columns){q.columns=columns;return api;},eq(column,value){q.filters.push([column,value]);return api;},
   order(column,{ascending}){q.orders.push([column,ascending]);return api;},range(from,to){q.offset=from;q.limit=to-from+1;return api;},
   single(){q.one=true;return api;},maybeSingle(){q.one=true;return api;},
   update(values){q.operation="update";q.values=values;return api;},
   upsert(values,options){q.operation="insert";q.values=values;q.options=options;return api;},
   then(resolve,reject){return run().then(resolve,reject);},
  };
  async function run(){
   try{
    const params=[];const param=v=>{params.push(v);return '$'+params.length;};
    const where=()=>q.filters.length?' where '+q.filters.map(([col,v])=>'t.'+ident(col)+'='+param(v)).join(' and '):'';
    let rows;
    if(q.operation==="insert"){
     const keys=Object.keys(q.values);const sql='insert into public.'+ident(table)+' ('+keys.map(ident).join(',')+') values ('+keys.map(k=>param(q.values[k])).join(',')+') on conflict ('+q.options.onConflict.split(',').map(ident).join(',')+') do nothing';
     rows=(await db.query(sql,params)).rows;
    }else if(q.operation==="update"){
     const set=Object.entries(q.values).map(([k,v])=>ident(k)+'='+param(v)).join(',');
     rows=(await db.query('update public.'+ident(table)+' t set '+set+where()+' returning t.*',params)).rows;
     if(q.columns.includes('books!inner'))for(const row of rows)row.books=(await db.query('select * from public.books where id=$1',[row.book_id])).rows[0];
    }else{
     const joined=q.columns.includes('books!inner');
     let sql=joined?'select t.*, row_to_json(b) as books from public.user_books t join public.books b on b.id=t.book_id':'select t.* from public.'+ident(table)+' t';
     sql+=where();if(q.orders.length)sql+=' order by '+q.orders.map(([col,asc])=>'t.'+ident(col)+(asc?' asc':' desc')).join(',');
     if(q.limit!=null)sql+=' limit '+q.limit+' offset '+q.offset;
     rows=(await db.query(sql,params)).rows;
    }
    rows=JSON.parse(JSON.stringify(rows));return {data:q.one?(rows[0]||null):rows,error:null};
   }catch(error){return {data:null,error};}
  }
  return api;
 }};
}

test("Home and Library operations use real RLS, enforce reading transitions, deduplicate saves and respect evidence consent",async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create schema auth; create schema extensions; create role anon; create role authenticated;
   grant usage on schema auth to anon,authenticated;
   create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql stable as $$ select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid $$;`);
  for(const file of ['202609220001_initial_schema_rls.sql','202610060001_reading_setup.sql'])await db.exec((await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto with schema extensions;',''));
  await db.exec(`insert into auth.users(id) values ('${a}'),('${b}');`);
  const role=async(user,which='authenticated')=>db.exec(`reset role; select set_config('request.jwt.claims','${user?JSON.stringify({sub:user}):'{}'}',false); set role ${which};`);
  const supabase=client(db);
  const metadata={googleBooksId:'Example',title:'Example',authors:['Author'],description:null,pageCount:100,categories:[],publishedDate:null,thumbnailUrl:null};
  let lookups=0;const lookup=async()=>{lookups++;return metadata;};
  await role(a);assert.deepEqual(await saveLibraryBook(supabase,a,'Example',lookup),{added:true});
  let home=await loadHome(supabase,a);assert.equal(homeSnapshotSchema.safeParse(home).success,true);assert.equal(home.books.length,1);assert.equal(home.books[0].status,'want_to_read');
  const owned=home.books[0].id;
  assert.equal((await mutateReaderBook(supabase,a,{kind:'progress',id:owned,percent:50})).status,409);
  let result=await mutateReaderBook(supabase,a,{kind:'start',id:owned});assert.equal(result.book.status,'reading');const startDate=result.book.startedAt;
  result=await mutateReaderBook(supabase,a,{kind:'progress',id:owned,percent:70});assert.equal(result.book.progressPercent,70);assert.equal(result.book.startedAt,startDate);
  await saveLibraryBook(supabase,a,'Example',lookup);home=await loadHome(supabase,a);assert.equal(home.books.length,1);assert.equal(home.books[0].progressPercent,70);assert.equal(home.books[0].status,'reading');assert.equal(lookups,1);
  result=await mutateReaderBook(supabase,a,{kind:'progress',id:owned,percent:100});assert.equal(result.book.status,'finished');assert.ok(result.book.finishedAt);
  assert.equal((await mutateReaderBook(supabase,a,{kind:'progress',id:owned,percent:99})).status,409);
  assert.equal((await mutateReaderBook(supabase,a,{kind:'start',id:owned})).status,409);
  await role(b);assert.equal((await loadHome(supabase,b)).books.length,0);
  assert.equal((await mutateReaderBook(supabase,b,{kind:'progress',id:owned,percent:10})).status,404);
  // RLS still denies the other reader if a data helper receives a spoofed userId.
  assert.equal((await mutateReaderBook(supabase,a,{kind:'progress',id:owned,percent:10})).status,404);
  await assert.rejects(saveLibraryBook(supabase,a,'Example',lookup));
  assert.deepEqual(await saveLibraryBook(supabase,b,'Example',lookup),{added:true});assert.equal((await loadHome(supabase,b)).books.length,1);assert.equal(lookups,1);
  await db.exec(`reset role; update public.user_books set rating=5 where user_id='${a}';
   update public.ai_settings set personalisation_enabled=true,use_recent_ratings=false,use_dnf_reasons=false where user_id='${a}';
   insert into public.reading_dna_signals(user_id,category,label,source_type,evidence) values
   ('${a}','genre','Chosen fantasy','onboarding','[]'),
   ('${a}','genre','Rated fantasy','rating','[{"user_book_id":"${owned}"}]'),
   ('${a}','genre','Private evidence','rating','[{"user_book_id":"${(await loadHome(supabase,b)).books[0].id}"}]'),
   ('${a}','genre','Unpermitted DNF','dnf','[{"user_book_id":"${owned}"}]');`);
  await role(a);home=await loadHome(supabase,a);assert.deepEqual(home.signals.map(s=>s.label),['Chosen fantasy']);
  await db.exec(`update public.ai_settings set use_recent_ratings=true where user_id='${a}'`);
  home=await loadHome(supabase,a);assert.equal(home.signals.length,2);assert.equal(home.signals.find(s=>s.source==='rating').evidence[0].title,'Example');
  assert.equal(home.signals.some(s=>s.label==='Private evidence'),false);assert.equal(home.signals.some(s=>s.source==='dnf'),false);
  await db.exec(`update public.ai_settings set personalisation_enabled=false where user_id='${a}'`);assert.deepEqual((await loadHome(supabase,a)).signals,[]);
  await role(null,'anon');await assert.rejects(loadHome(supabase,a));assert.equal((await mutateReaderBook(supabase,a,{kind:'start',id:owned})).status,503);await assert.rejects(saveLibraryBook(supabase,a,'Example',lookup));
 }finally{await db.close();}
});
