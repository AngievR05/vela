import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { requestGemini } from "../src/lib/gemini-request.js";
const schema=z.object({ok:z.boolean()}).strict();
const success=()=>Response.json({candidates:[{finishReason:"STOP",content:{parts:[{thought:true,text:"Hidden reasoning"},{text:'{"ok":true}'}]}}]});
test("Gemini retries overload with an alternate model and never includes credentials in errors",async()=>{
 const urls=[],waits=[];
 const value=await requestGemini(schema,"Instruction",{request:"A book"},{apiKey:"secret",wait:async ms=>waits.push(ms),fetcher:async(url,request)=>{
  urls.push(url);assert.equal(request.headers["x-goog-api-key"],"secret");assert.equal(JSON.parse(request.body).generationConfig.thinkingConfig.thinkingLevel,"low");
  return urls.length===1?Response.json({error:{message:"High demand"}},{status:503}):success();
 }});
 assert.deepEqual(value,{ok:true});assert.equal(urls.length,2);assert.match(urls[1],/gemini-3.1-flash-lite:/);assert.ok(waits[0]>=600);
 let calls=0;await assert.rejects(requestGemini(schema,"",{}, {apiKey:"SECRET KEY",wait:async()=>{},fetcher:async()=>{calls++;return new Response(null,{status:403});}}),error=>!error.message.includes("SECRET"));assert.equal(calls,1);
});
test("invalid JSON is repaired with bounded retries; blocked output and exhausted retries stay failures",async()=>{
 let calls=0;await requestGemini(schema,"",{}, {apiKey:"key",wait:async()=>{},fetcher:async()=>{calls++;return calls===1?Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:'{"ok":"wrong"}'}]}}]}):success();}});assert.equal(calls,2);
 calls=0;await assert.rejects(requestGemini(schema,"",{}, {apiKey:"key",wait:async()=>{},fetcher:async()=>{calls++;return new Response(null,{status:429});}}));assert.equal(calls,3);
 calls=0;await assert.rejects(requestGemini(schema,"",{}, {apiKey:"key",wait:async()=>{},fetcher:async()=>{calls++;return Response.json({candidates:[{finishReason:"SAFETY"}]});}}));assert.equal(calls,1);
});

test('Gemini retries schema-valid results when verified catalogue evidence fails',async()=>{
 let calls=0;const result=await requestGemini(schema,'',{}, {apiKey:'key',wait:async()=>{},fetcher:async()=>{calls++;return success()},validate:()=>{if(calls===1)throw new Error('Unsupported book evidence')}});assert.deepEqual(result,{ok:true});assert.equal(calls,2);
});
