import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { recommendationRequestSchema, validRecommendations, eligibleCandidates } from "../src/lib/validation/recommendation.js";
import { createRecommendations } from "../src/lib/recommendation-data.js";
const a="abd563cb-fdcc-4208-9e62-e1457a9df95e",b="dce88169-75db-43ef-8682-21949d0ab369",session="08978c87-0a49-4382-9e32-801751323371";
const filters={source:"anywhere",genre:"",mood:"",length:"any"};
const candidates=[1,2,3].map(index=>({googleBooksId:`rec-${index}`,title:`Book ${index}`,authors:["Author"],categories:["Fantasy"],pageCount:250,thumbnailUrl:null}));
test("the server broadens empty catalogue searches and never sends opted-out signals or private notes to the model",async()=>{
 const tables={ profiles:[{id:a,display_name:"Reader"}], ai_settings:[{user_id:a,personalisation_enabled:false,use_recent_ratings:true,use_dnf_reasons:true}],
  user_books:[{id:b,user_id:a,book_id:b,status:"finished",progress_percent:100,current_page:null,rating:5,notes:"SECRET PRIVATE NOTES",is_favourite:true,is_removed:false,dnf_use_for_learning:false,started_at:null,finished_at:"2026-10-06",updated_at:"2026-10-06T00:00:00Z",books:{google_books_id:"owned-history",title:"Private reading history",authors:["Writer"],categories:[],page_count:200}}],
  reading_dna_signals:[{id:b,user_id:a,active:true,category:"genre",label:"SECRET PRIVATE SIGNAL",source_type:"rating",evidence:[{user_book_id:b}],updated_at:"2026-10-06T00:00:00Z",internal_weight:0.8}],recommendation_sessions:[],recommendations:[],recommendation_feedback:[] };
 const supabase={from(table){let one=false;const filters=[];const query={select(){return query;},eq(key,value){filters.push([key,value]);return query;},order(){return query;},limit(){return query;},range(){return query;},single(){one=true;return query;},maybeSingle(){one=true;return query;},then(resolve){const rows=tables[table].filter(row=>filters.every(([key,value])=>row[key]===value));return Promise.resolve({data:one?rows[0]||null:rows,error:null}).then(resolve);}};return query;},
  async rpc(name,args){assert.equal(name,"save_recommendation_session");assert.deepEqual(args.allowed_signals,[]);
   tables.recommendation_sessions=[{id:args.session_key,user_id:a,request_text:args.reading_request,filters:args.selected_filters,status:"completed",created_at:"2026-10-06T00:00:00Z"}];
   tables.recommendations=args.results.map((rec,index)=>({id:[a,b,session][index],user_id:a,session_id:args.session_key,rank:rec.rank,reason:rec.reason,matched_signals:rec.matchedSignals,confidence_label:rec.confidence,recommendation_feedback:[],books:{google_books_id:rec.book.googleBooksId,title:rec.book.title,authors:rec.book.authors,categories:rec.book.categories,page_count:rec.book.pageCount,thumbnail_url:null,description:null,published_date:null}}));
   return {data:args.session_key,error:null};},
 };
 let calls=0,searches=0;const output=await createRecommendations(supabase,a,{entryId:session,request:"Atmospheric fantasy",filters},{search:async query=>{searches++;return query==="subject:Fantasy"?candidates:[];},generate:async(schema,instruction,data)=>{
  assert.equal(JSON.stringify(data).includes("SECRET"),false);assert.equal(JSON.stringify(data).includes("owned-history"),false);
  calls++;if(calls===1)return {needsContext:false,queries:["atmospheric fantasy"]};assert.deepEqual(data.signals,[]);
  return {recommendations:candidates.map(book=>({bookId:book.googleBooksId,reason:"Fits the supplied fantasy metadata.",matchedSignals:[],confidence:"Good match",bookEvidence:["Fantasy"]}))};
 }});
 assert.equal(calls,2);assert.equal(searches,3);assert.equal(output.session.recommendations.length,3);assert.equal(output.session.userId,a);
});
test("recommendation requests cannot supply reader identity, candidates or permitted evidence",()=>{
 const request={entryId:session,request:"Atmospheric fantasy",filters};
 assert.equal(recommendationRequestSchema.safeParse(request).success,true);
 for(const extra of [{userId:b},{permittedSignals:[]},{candidates}])assert.equal(recommendationRequestSchema.safeParse({...request,...extra}).success,false);
 const output={recommendations:candidates.map(book=>({bookId:book.googleBooksId,reason:"Fits the supplied fantasy metadata.",matchedSignals:[],confidence:"Good match"}))};
 assert.equal(validRecommendations(output,candidates,[]).length,3);
 assert.throws(()=>validRecommendations({...output,recommendations:[...output.recommendations.slice(0,2),{...output.recommendations[2],bookId:"invented"}]},candidates,[]));
 assert.throws(()=>validRecommendations({...output,recommendations:output.recommendations.map(rec=>({...rec,matchedSignals:[b]}))},candidates,[]));
 assert.throws(()=>validRecommendations({...output,recommendations:[output.recommendations[0],output.recommendations[0],output.recommendations[2]]},candidates,[]));
 assert.equal(eligibleCandidates([...candidates,{...candidates[0],googleBooksId:"unknown",pageCount:null}],{...filters,length:"300"},["rec-2"]).length,2);
 assert.equal(eligibleCandidates(Array.from({length:90},(_,i)=>({...candidates[0],googleBooksId:`volume${i}`,title:`Different work ${i}`})),filters).length,30);
});
test("recommendation sessions save atomically under RLS; feedback, explicit corrections and Undo preserve reader boundaries",async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create schema auth; create schema extensions; create role anon; create role authenticated; grant usage on schema auth to anon,authenticated;
   create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select(current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;`);
  for(const file of ['202609220001_initial_schema_rls.sql','202610060001_reading_setup.sql','202610060002_library_detail.sql','202610060003_recommendations.sql'])await db.exec((await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto with schema extensions;',''));
  await db.exec(`insert into auth.users(id) values('${a}'),('${b}'); update public.ai_settings set personalisation_enabled=true where user_id='${a}';`);
  const signal=(await db.query("insert into public.reading_dna_signals(user_id,category,label,source_type,internal_weight) values($1,'genre','Fantasy','onboarding',0.8) returning id",[a])).rows[0].id;
  const role=async(user,kind='authenticated')=>db.exec(`reset role; select set_config('request.jwt.claims','${JSON.stringify(user?{sub:user}:{})}',false); set role ${kind};`);
  const recs=candidates.map((book,index)=>({rank:index+1,book,reason:"Supplied metadata fits your request.",confidence:"good_match",matchedSignals:[signal]}));
  const save=(key,results=recs,signals=[{id:signal}])=>db.query("select public.save_recommendation_session($1,$2,$3,$4,$5,$6) as id",[key,'Fantasy',JSON.stringify(filters),JSON.stringify(signals),candidates.map(book=>book.googleBooksId),JSON.stringify(results)]);
  await role(a);assert.equal((await save(session)).rows[0].id,session);await save(session);assert.equal((await db.query('select id from public.recommendations')).rows.length,3);
  const rec=(await db.query('select id from public.recommendations order by rank')).rows[0].id;
  const feedback=(action,signalId=null,correction=null)=>db.query("select public.record_recommendation_feedback($1,$2,$3,$4,$5)",[rec,action,action==='not_for_me'?'Wrong genre':null,signalId,correction]);
  await feedback('not_for_me');assert.equal(Number((await db.query('select internal_weight from public.reading_dna_signals')).rows[0].internal_weight),0.8);
  await feedback('show_less');assert.equal((await db.query('select preference_effect from public.recommendation_feedback')).rows[0].preference_effect,'show_less');
  await feedback('undo_less');assert.equal((await db.query('select preference_effect from public.recommendation_feedback')).rows[0].preference_effect,null);
  await feedback('correct',signal,'reduce');await feedback('correct',signal,'reduce');assert.equal(Number((await db.query('select internal_weight from public.reading_dna_signals')).rows[0].internal_weight),0.4);
  assert.equal((await db.query('select source_type from public.reading_dna_signals')).rows[0].source_type,'onboarding');
  const badKey="a16658fe-d9b7-4315-b84a-a62172aebc1b";
  await assert.rejects(save(badKey,recs.map(row=>({...row,matchedSignals:[b]}))),error=>error.code==='42501');
  assert.equal((await db.query('select id from public.recommendation_sessions where id=$1',[badKey])).rows.length,0);
  await role(b);assert.equal((await db.query('select id from public.recommendations')).rows.length,0);await assert.rejects(feedback('show_less'),error=>error.code==='42501');
  await assert.rejects(save(session),error=>error.code==='42501');await assert.rejects(save(badKey),error=>error.code==='42501');
  await role(a);await feedback('correct',signal,'remove');assert.equal((await db.query('select active from public.reading_dna_signals')).rows[0].active,false);
  await role(null,'anon');await assert.rejects(save(session),error=>error.code==='42501');await assert.rejects(feedback('helpful'),error=>error.code==='42501');
 }finally{await db.close();}
});
