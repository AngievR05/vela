import test from "node:test";
import assert from "node:assert/strict";
import { bookFit, bookGenres, verifiedBookClues } from "../src/lib/book-insights.js";
import { applyBookMutation } from "../src/lib/home-data.js";

test("book interpretations require real description quotes and reject invented or empty evidence",()=>{
  const book={categories:["Fiction / Fantasy / Epic","Fantasy"],description:"<p>A hopeful story about a found family on a dangerous journey.</p>"};
  const claims={pace:{label:"Relentless",evidence:"A breathless thriller from start to finish."},moods:[{label:"Hopeful",evidence:"A hopeful story"},{label:"Dark",evidence:"!!!!!!!!!!!!"}],tropes:[{label:"Found family",evidence:"a found family"},{label:"Found family",evidence:"a found family"}]};
  const actual=verifiedBookClues(claims,book);
  assert.equal(actual.pace,null);
  assert.deepEqual(actual.moods.map(item=>item.label),["Hopeful"]);
  assert.deepEqual(actual.tropes.map(item=>item.label),["Found family"]);
  assert.deepEqual(bookGenres(book),["Fantasy","Epic"]);
  assert.deepEqual(verifiedBookClues(claims,{description:null}),{pace:null,moods:[],tropes:[]});
});
test("book fit honours disabled personalisation and never interprets DNF/rating signals as liked characteristics",()=>{
  const book={categories:["Fiction / Fantasy"],description:"Your private notes must never inform fit."};
  const signals=[{label:"Fantasy",source:"onboarding"},{label:"Dark",source:"dnf"},{label:"Hopeful",source:"rating"},{label:"Found family",source:"correction"}];
  const clues={pace:null,moods:[{label:"Dark"},{label:"Hopeful"}],tropes:[{label:"Found family"}]};
  assert.deepEqual(bookFit(book,{personalisationEnabled:false,signals},clues).matches,[]);
  assert.deepEqual(bookFit(book,{personalisationEnabled:true,signals},clues).matches,["Fantasy","Found family"]);
  assert.deepEqual(bookFit({...book,categories:[]},{personalisationEnabled:true,signals:signals.slice(1,3)},clues).matches,[]);
  assert.match(bookFit(book,{personalisationEnabled:true,signals:[]}).text,/Choose some preferences/);
});
test("moving to DNF and restoring to TBR preserve exact pages; finishing records the final page",()=>{
  const book={id:"book",status:"reading",progressPercent:45,currentPage:232,pageCount:516,startedAt:"2026-10-01"};
  const dnf=applyBookMutation({books:[book]},{id:"book",kind:"status",status:"dnf",reason:"Stopped",useForLearning:false});
  assert.equal(dnf.books[0].currentPage,232);
  const restored=applyBookMutation(dnf,{id:"book",kind:"status",status:"want_to_read"});
  assert.equal(restored.books[0].currentPage,232);
  assert.equal(restored.books[0].progressPercent,45);
  assert.equal(applyBookMutation(restored,{id:"book",kind:"status",status:"finished"}).books[0].currentPage,516);
});
