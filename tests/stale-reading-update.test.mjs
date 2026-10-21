import test from "node:test";
import assert from "node:assert/strict";
import { mutateReaderBook } from "../src/lib/reader-library.js";

const userId="11111111-1111-4111-8111-111111111111",id="22222222-2222-4222-8222-222222222222",operationId="33333333-3333-4333-8333-333333333333";
const current="2026-10-21T12:00:00Z",old="2026-10-20T12:00:00Z";
function client({replay=null,replayError=null}={}) {
  const calls={rpc:0,replayFilters:[]};
  const row={id,user_id:userId,book_id:id,status:"reading",progress_percent:40,updated_at:current,books:{google_books_id:"real",title:"Book",authors:[]}};
  return {calls,from(table){
    const query={select(){return query;},eq(key,value){if(table==="reader_book_updates")calls.replayFilters.push([key,value]);return query;},async maybeSingle(){return table==="reader_book_updates"?{data:replay,error:replayError}:{data:row,error:null};}};
    return query;
  },async rpc(){calls.rpc++;return {data:{duplicate:true,operationId},error:null};}};
}
test("obsolete reading edits return conflict without entering a write transaction",async()=>{
  for(const kind of ["progress","finish","dnf","reading_dates","restore_reading","undo_reading"]){
    const db=client();const result=await mutateReaderBook(db,userId,{kind,id,operationId,expectedUpdatedAt:old});
    assert.equal(result.status,409);assert.equal(db.calls.rpc,0);
    assert.deepEqual(db.calls.replayFilters,[["id",operationId],["user_id",userId],["user_book_id",id]]);
  }
});
test("a saved operation can be retried after later edits without bypassing RPC validation",async()=>{
  const db=client({replay:{id:operationId}});const result=await mutateReaderBook(db,userId,{kind:"progress",id,operationId,expectedUpdatedAt:old,percent:20});
  assert.equal(db.calls.rpc,1);assert.equal(result.duplicate,true);assert.equal(result.book.progressPercent,40);
});
test("current reading writes avoid the replay lookup; failed replay checks remain retryable",async()=>{
  const fresh=client();await mutateReaderBook(fresh,userId,{kind:"progress",id,operationId,expectedUpdatedAt:current,percent:20});
  assert.equal(fresh.calls.rpc,1);assert.deepEqual(fresh.calls.replayFilters,[]);
  const unavailable=client({replayError:{message:"Unavailable"}});const result=await mutateReaderBook(unavailable,userId,{kind:"progress",id,operationId,expectedUpdatedAt:old,percent:20});
  assert.equal(result.status,503);assert.equal(unavailable.calls.rpc,0);
});
