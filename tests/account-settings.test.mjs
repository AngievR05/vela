import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {z} from "zod";
const a="abd563cb-fdcc-4208-9e62-e1457a9df95e",b="dce88169-75db-43ef-8682-21949d0ab369";
test("Account verifies the same reader, preserves PKCE email confirmation and guards deletion credentials",async()=>{
 let cookie=null,signInId=a,verifyId=a,updates=0,deletes=0;const cookieWrites=[];
 const source=(await readFile(new URL('../src/app/api/account/route.js',import.meta.url),'utf8')).replace(/^import .*;\r?$/gm,'');
 const reader={user:{id:a,email:"reader@example.com"},supabase:{auth:{updateUser:async(body,options)=>{updates++;assert.equal(body.email,"new@example.com");assert.match(options.emailRedirectTo,/\/auth\/callback\?next=\/settings$/);return {data:{user:{email:"reader@example.com",new_email:body.email}},error:null};},signOut:async()=>({error:null})}}};
 globalThis.velaAccountTest={z,getReader:async()=>reader,readerDeniedResponse:()=>null,publicEnv:{NEXT_PUBLIC_SUPABASE_URL:"https://example.supabase.co",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"test-key"},cookies:async()=>({get:()=>cookie?{value:cookie}:null,set:(name,value,options)=>{cookie=value;cookieWrites.push(options);}}),createClient:(url,key,options)=>({auth:{signInWithPassword:async()=>({data:{user:{id:signInId},session:{access_token:"fixture-token"}},error:null}),getUser:async token=>{assert.equal(token,"fixture-token");return {data:{user:{id:verifyId}},error:null};}},rpc:async(name,args)=>{assert.equal(options.global.headers.Authorization,"Bearer fixture-token");assert.equal(name,"delete_reader_account");assert.deepEqual(args,{confirmation:"DELETE"});deletes++;return {error:null};}})};
 try{
  const prefix='const {z,getReader,readerDeniedResponse,publicEnv,cookies,createClient}=globalThis.velaAccountTest;';
  const {POST,DELETE}=await import('data:text/javascript;base64,'+Buffer.from(prefix+source).toString('base64'));
  const request=(body,method='POST')=>new Request('http://localhost:3000/api/account',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  signInId=b;assert.equal((await POST(request({kind:'email',email:'new@example.com',password:'fixture-password'}))).status,400);assert.equal(updates,0);
  signInId=a;assert.equal((await POST(request({kind:'email',email:'new@example.com',password:'fixture-password',userId:b}))).status,400);
  const email=await POST(request({kind:'email',email:'new@example.com',password:'fixture-password'}));assert.equal(email.status,200);assert.equal((await email.json()).pendingEmail,'new@example.com');assert.equal(updates,1);
  assert.equal((await DELETE(request({confirmation:'DELETE'},'DELETE'))).status,401);assert.equal(deletes,0);
  assert.equal((await POST(request({kind:'verify-delete',password:'fixture-password'}))).status,200);assert.equal(cookieWrites[0].httpOnly,true);assert.equal(cookieWrites[0].sameSite,'strict');assert.equal(cookieWrites[0].maxAge,300);
  verifyId=b;assert.equal((await DELETE(request({confirmation:'DELETE'},'DELETE'))).status,401);assert.equal(deletes,0);
  verifyId=a;assert.equal((await DELETE(request({confirmation:'DELETE',userId:b},'DELETE'))).status,400);
  assert.equal((await DELETE(request({confirmation:'DELETE'},'DELETE'))).status,200);assert.equal(deletes,1);assert.equal(cookieWrites.at(-1).maxAge,0);
 }finally{delete globalThis.velaAccountTest;}
});
