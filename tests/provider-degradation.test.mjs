import test from "node:test";
import assert from "node:assert/strict";
import {z} from "zod";
import {assertFreeGemini,createQuotaGuard} from "../src/lib/provider-policy.js";
import {requestGemini} from "../src/lib/gemini-request.js";
import {searchGoogleBooksRequest,getGoogleBookRequest} from "../src/lib/google-books-request.js";
const models={model:"gemini-3.5-flash-lite",fallbackModel:"gemini-3.1-flash-lite"};
test("Gemini deployment defaults closed and never selects an unapproved paid model",()=>{
 assert.throws(()=>assertFreeGemini({...models}),/free-tier billing/);
 assert.throws(()=>assertFreeGemini({...models,verified:true,enabled:false}),/paused/);
 assert.throws(()=>assertFreeGemini({...models,verified:true,model:"gemini-pro"}),/not approved/);
 assert.throws(()=>assertFreeGemini({...models,verified:true,fallbackModel:"gemini-pro"}),/not approved/);
 assert.doesNotThrow(()=>assertFreeGemini({...models,verified:true}));
});
test("Gemini 429 blocks immediate retries and model fallback, and recovers after cooldown",async()=>{
 let now=0,calls=0;const guard=createQuotaGuard({now:()=>now});const schema=z.object({ok:z.boolean()});
 const options={apiKey:"SECRET",quotaGuard:guard,wait:async()=>{},fetcher:async()=>{calls++;return new Response(null,{status:429})}};
 await assert.rejects(requestGemini(schema,"",{},options),/429/);assert.equal(calls,1);
 await assert.rejects(requestGemini(schema,"",{},options),/quota reached/);assert.equal(calls,1);
 now=60001;const result=await requestGemini(schema,"",{},{...options,fetcher:async()=>{calls++;return Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:'{"ok":true}'}]}}]})}});
 assert.deepEqual(result,{ok:true});assert.equal(calls,2);
});
test("Gemini availability failures stay bounded; missing credentials, 402 and 403 never trigger fallback",async()=>{
 const schema=z.object({ok:z.boolean()});let calls=0;
 await assert.rejects(requestGemini(schema,"",{},{apiKey:"",fetcher:async()=>{calls++}}));assert.equal(calls,0);
 for(const status of [402,403,503]){calls=0;await assert.rejects(requestGemini(schema,"",{},{apiKey:"SECRET",quotaGuard:createQuotaGuard(),wait:async()=>{},fetcher:async()=>{calls++;return new Response(null,{status})}}),e=>!e.message.includes("SECRET"));assert.equal(calls,status===503?3:1);}
 calls=0;await assert.rejects(requestGemini(schema,"",{},{apiKey:"SECRET",quotaGuard:createQuotaGuard(),wait:async()=>{},fetcher:async()=>{calls++;throw new DOMException("Timed out","TimeoutError")}}));assert.equal(calls,3);
});
test("Google Books quota, outages, missing keys and recovery do not fabricate catalogue results",async()=>{
 let now=0,calls=0;const guard=createQuotaGuard({now:()=>now});const options={apiKey:"SECRET",quotaGuard:guard,fetcher:async()=>{calls++;return new Response(null,{status:429})}};
 await assert.rejects(searchGoogleBooksRequest("fantasy",10,options),/429/);
 await assert.rejects(getGoogleBookRequest("book",options),/quota reached/);assert.equal(calls,1);
 now=60001;assert.equal(await getGoogleBookRequest("gone",{...options,fetcher:async()=>new Response(null,{status:404})}),null);
 await assert.rejects(searchGoogleBooksRequest("fantasy",10,{...options,fetcher:async()=>new Response(null,{status:503})}),e=>e.message.includes("503")&&!e.message.includes("SECRET"));
 const books=await searchGoogleBooksRequest("fantasy",10,{...options,fetcher:async()=>Response.json({items:[{id:"real-volume",volumeInfo:{title:"Real volume",authors:["Writer"],imageLinks:{thumbnail:"http://books.google.com/books/content?id=real-volume"}}}]})});
 assert.equal(books[0].googleBooksId,"real-volume");assert.match(books[0].thumbnailUrl,/^https:/);
 await assert.rejects(searchGoogleBooksRequest("fantasy",10,{apiKey:"",fetcher:async()=>{throw Error("Must not call")}}),/manually/);
});
