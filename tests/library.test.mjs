import test from "node:test";
import assert from "node:assert/strict";
import { filterLibrary, manualBookSchema, detailMutationSchema, readingDays } from "../src/lib/library-data.js";
import {mutateReaderBook} from "../src/lib/reader-library.js";

const id = "08978c87-0a49-4382-9e32-801751323371";
test("reflection edits accept only structured choices and a version of the saved book",()=>{
 const reflection={kind:"reflection",id,expectedUpdatedAt:"2026-10-12T08:00:00Z",feedback:["Characters","Mystery"]};
 assert.equal(detailMutationSchema.safeParse(reflection).success,true);
 for(const invalid of [{...reflection,feedback:["Invented trait"]},{...reflection,feedback:["Characters","Characters"]},{...reflection,userId:id},{...reflection,finishedAt:"2026-10-12"},{...reflection,useForLearning:true},{...reflection,expectedUpdatedAt:undefined}])assert.equal(detailMutationSchema.safeParse(invalid).success,false);
 assert.equal(detailMutationSchema.safeParse({...reflection,feedback:[]}).success,true);
});
test("reflection saving scopes ownership, rejects stale or unfinished records and preserves saved consent",async()=>{
 const userId="11111111-1111-4111-8111-111111111111",stamp="2026-10-12T08:00:00Z";
 let row={id,user_id:userId,status:"finished",is_removed:false,updated_at:stamp,finish_feedback:['Characters'],finish_use_for_learning:false,finished_at:'2026-10-01',rating:5,notes:'PRIVATE',books:{google_books_id:'real',title:'Book'}},changes=null,conditions=[];
 const supabase={from(table){assert.equal(table,'user_books');const filters=[];const query={select(){return query;},eq(key,value){filters.push([key,value]);return query;},update(value){changes=value;return query;},async maybeSingle(){conditions.push(filters);return {data:row,error:null};}};return query;}};
 const mutation={kind:'reflection',id,expectedUpdatedAt:stamp,feedback:['Mystery']};
 const result=await mutateReaderBook(supabase,userId,mutation);assert.equal(result.book.status,'finished');assert.deepEqual(changes.finish_feedback,['Mystery']);
 assert.deepEqual(Object.keys(changes).sort(),['finish_feedback','reflection_recorded_at']);assert.equal(conditions.every(filters=>filters.some(([key,value])=>key==='user_id'&&value===userId)),true);assert.ok(conditions[1].some(([key,value])=>key==='updated_at'&&value===stamp));
 changes=null;row={...row,status:'reading'};assert.equal((await mutateReaderBook(supabase,userId,mutation)).status,409);assert.equal(changes,null);
 row={...row,status:'finished',updated_at:'2026-10-12T09:00:00Z'};assert.equal((await mutateReaderBook(supabase,userId,mutation)).status,409);assert.equal(changes,null);
});
test("manual entries validate ISBN checksums and reject spoofed ownership", () => {
  const entry = { entryId: id, title: " A book ", author: " Reader ", isbn: "978-0-06-267810-2", pageCount: 526 };
  assert.equal(manualBookSchema.parse(entry).isbn, "9780062678102");
  assert.equal(manualBookSchema.parse({ ...entry, isbn: "0-8044-2957-X" }).isbn, "080442957X");
  for (const invalid of [{ ...entry, isbn: "9780062678103" }, { ...entry, title: " " }, { ...entry, pageCount: 0 }, { ...entry, userId: id }]) {
    assert.equal(manualBookSchema.safeParse(invalid).success, false);
  }
  assert.equal(detailMutationSchema.safeParse({ kind: "status", id, status: "dnf", reason: " ", useForLearning: false }).success, false);
  assert.equal(detailMutationSchema.safeParse({ kind: "status", id, status: "dnf", reason: "Pacing" }).success, false);
});

test("combined Library filters exclude removed and unknown-length books without mutating the Library", () => {
  const books = [
    { id: "a", title: "Zebra", author: "Writer", status: "reading", categories: ["Fiction / Fantasy"], pageCount: 399, favourite: true, rating: 4, updatedAt: "2026-10-01" },
    { id: "b", title: "Alpha", author: "Another", status: "want_to_read", categories: ["Fantasy"], pageCount: null, favourite: true, rating: null, updatedAt: "2026-10-02" },
    { id: "c", title: "Removed", author: "Writer", status: "reading", categories: ["Fantasy"], pageCount: 120, favourite: true, isRemoved: true, updatedAt: "2026-10-03" },
  ];
  assert.deepEqual(filterLibrary(books, { query: "WRITER", genres: ["Fantasy"], short: true, favourites: true, status: "reading" }).map(book => book.id), ["a"]);
  assert.deepEqual(filterLibrary(books, { sort: "title" }).map(book => book.id), ["b", "a"]);
  assert.deepEqual(filterLibrary(books, { short: true }).map(book => book.id), ["a"]);
  assert.deepEqual(books.map(book => book.id), ["a", "b", "c"]);
  assert.equal(readingDays({ startedAt: "2026-10-01", finishedAt: "2026-10-06" }), 6);
  assert.equal(readingDays({ startedAt: null, finishedAt: "2026-10-06" }), null);
});
