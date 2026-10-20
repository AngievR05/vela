import test from "node:test";
import assert from "node:assert/strict";
import {googleCoverUrl} from "../src/lib/book-cover-url.js";
import {getGoogleIsbnCoverRequest} from "../src/lib/google-books-request.js";
import {isbnVariants,exactImportMatch,findImportMetadata,sameImportWork} from "../src/lib/library-import.js";
import {createCoverResolver} from "../src/lib/cover-resolution.js";
import {createIsbnCatalogue} from "../src/lib/isbn-catalogue.js";
import {createQuotaGuard} from "../src/lib/provider-policy.js";
const cover="https://books.google.com/books/content?id=verified&img=1&zoom=1";
const book={googleBooksId:"manual:import:reader:book",title:"Piranesi",author:"Susanna Clarke",isbn:"9781635575637",coverSrc:null};
test("CSV matching recognises equivalent ISBNs, series labels and cover-bearing editions without accepting other works",async()=>{
 assert.deepEqual(isbnVariants("9781635575637"),["9781635575637","163557563X"]);
 assert.deepEqual(isbnVariants("163557563X"),["163557563X","9781635575637"]);
 assert.deepEqual(isbnVariants("not-an-isbn"),[]);
 assert.equal(exactImportMatch(book,{isbns:["163557563X"]}),true);
 assert.equal(sameImportWork({...book,title:"Piranesi (Fantasy, #1)"},{title:"Piranesi",authors:["Susanna Clarke"]}),true);
 assert.equal(sameImportWork(book,{title:"Piranesi",authors:["Another Writer"]}),false);
 assert.equal(sameImportWork(book,{title:"Piranesi Study Guide",authors:["Susanna Clarke"]}),false);
 const result=await findImportMetadata(book,async()=>[{googleBooksId:"no-cover",isbns:[book.isbn],thumbnailUrl:null},{googleBooksId:"covered",isbns:["163557563X"],thumbnailUrl:cover}]);
 assert.equal(result.googleBooksId,"covered");
});
test("Google ISBN cover responses are parsed as data and reject executable payloads and foreign image URLs",async()=>{
 const response=thumbnail_url=>new Response(`velaCover(${JSON.stringify({['ISBN:'+book.isbn]:{bib_key:'ISBN:'+book.isbn,thumbnail_url}})});`);
 assert.equal(await getGoogleIsbnCoverRequest(book.isbn,{fetcher:async url=>{assert.equal(url.searchParams.get("bibkeys"),'ISBN:'+book.isbn);assert.equal(url.searchParams.has("key"),false);return response(cover);}}),cover);
 assert.equal(await getGoogleIsbnCoverRequest(book.isbn,{fetcher:async()=>response("https://evil.example/image")}),null);
 await assert.rejects(getGoogleIsbnCoverRequest(book.isbn,{fetcher:async()=>new Response('velaCover({});malicious()')}),/Invalid/);
 assert.equal(googleCoverUrl("http://bks4.books.google.com/books/content?id=book&img=1&zoom=5&imgtk=expired"),"https://books.google.com/books/content?id=book&img=1&zoom=1");
 for(const url of ['https://books.google.com.evil.example/cover','https://user@books.google.com/cover','javascript:bad'])assert.equal(googleCoverUrl(url),null);
});
test("already imported books resolve ISBN covers during catalogue outages and coalesce repeated lookups",async()=>{
 let calls=0;const resolve=createCoverResolver({isbnCover:async()=>{calls++;return cover;},search:async()=>{throw new Error('Catalogue 503');},lookup:async()=>{throw new Error('Catalogue 503');}});
 assert.deepEqual(await Promise.all([resolve(book),resolve(book)]),[cover,cover]);assert.equal(calls,1);
});
test("cover recovery uses verified title/author for ISBN-less imports and backs off failures without inventing images",async()=>{
 let now=0,calls=0;const resolve=createCoverResolver({now:()=>now,isbnCover:async()=>null,lookup:async()=>null,search:async()=>{calls++;if(now===0)throw new Error('503');return [{title:'Piranesi',authors:['Susanna Clarke'],thumbnailUrl:cover}];}});
 await assert.rejects(resolve({...book,isbn:null}),/temporarily unavailable/);await assert.rejects(resolve({...book,isbn:null}));assert.equal(calls,1);
 now=60001;assert.equal(await resolve({...book,isbn:null}),cover);assert.equal(calls,2);
 const noMatch=createCoverResolver({isbnCover:async()=>null,lookup:async()=>null,search:async()=>[{title:'Piranesi',authors:['Other Writer'],thumbnailUrl:cover}]});
 assert.equal(await noMatch({...book,isbn:null}),null);
});
test("ISBN-less imports recover Google covers using verified bibliographic matches during a catalogue outage",async()=>{
 const findIsbns=createIsbnCatalogue({fetcher:async url=>{assert.equal(url.searchParams.get('fields'),'title,author_name,isbn');assert.equal(url.searchParams.has('notes'),false);return Response.json({docs:[{title:'Piranesi',author_name:['Other Writer'],isbn:['9780143119685']},{title:'Piranesi',author_name:['Susanna Clarke'],isbn:[book.isbn,'invalid']}]});}});
 assert.deepEqual(await findIsbns(book),[book.isbn]);
 const resolve=createCoverResolver({isbnCover:async isbn=>{assert.equal(isbn,book.isbn);return cover;},lookup:async()=>null,search:async()=>{throw new Error('503');},findIsbns:async()=>[book.isbn]});
 assert.equal(await resolve({...book,isbn:null}),cover);
});
test("ISBN catalogue calls are paced and 429 pauses retries",async()=>{
 let now=0,calls=0;const waits=[];const find=createIsbnCatalogue({now:()=>now,wait:async ms=>{waits.push(ms);now+=ms;},fetcher:async()=>{calls++;return Response.json({docs:[]});}});
 await find(book);await find({...book,title:'Another'});assert.deepEqual(waits,[1100]);assert.equal(calls,2);
 const limited=createIsbnCatalogue({now:()=>now,fetcher:async()=>{calls++;return new Response(null,{status:429});}});
 await assert.rejects(limited(book));await assert.rejects(limited(book),/quota/);assert.equal(calls,3);
});
test("Google ISBN cover quota blocks immediate requests across different books",async()=>{
 let now=0,calls=0;const quotaGuard=createQuotaGuard({now:()=>now}),fetcher=async()=>{calls++;return new Response(null,{status:429});};
 await assert.rejects(getGoogleIsbnCoverRequest(book.isbn,{fetcher,quotaGuard}));
 await assert.rejects(getGoogleIsbnCoverRequest('9780143119685',{fetcher,quotaGuard}),/quota/);assert.equal(calls,1);
 now=60001;await assert.rejects(getGoogleIsbnCoverRequest(book.isbn,{fetcher,quotaGuard}));assert.equal(calls,2);
});
