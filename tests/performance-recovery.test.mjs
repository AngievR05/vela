import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreHomeState,HOME_FRESH_MS} from '../src/lib/home-recovery.js';
import {readerPreferencesResponse,defaultReaderPreferences} from '../src/lib/reader-settings.js';
const userId='abd563cb-fdcc-4208-9e62-e1457a9df95e';
const other='dce88169-75db-43ef-8682-21949d0ab369';
const snapshot={version:1,userId,displayName:'Reader',fetchedAt:100000,books:[],personalisationEnabled:true,signals:[]};
const restore=(options={})=>restoreHomeState({rawSnapshot:JSON.stringify(snapshot),rawQueue:'[]',userId,online:true,now:100001,...options});
test('fresh reader snapshot appears immediately without a redundant navigation request',()=>{
 const result=restore();assert.equal(result.phase,'ready');assert.equal(result.revalidate,false);assert.equal(result.snapshot.userId,userId);
 for(const now of [100000+HOME_FRESH_MS,99999]){const value=restore({now});assert.equal(value.phase,'ready');assert.equal(value.revalidate,true);}
});
test('recent reading activity and pending offline progress invalidate fresh navigation cache',()=>{
 assert.equal(restore({rawActivity:JSON.stringify({at:100001})}).revalidate,true);
 assert.equal(restore({rawActivity:JSON.stringify({at:99999})}).revalidate,false);
 assert.equal(restore({rawActivity:'broken'}).revalidate,true);
 const queue=[{kind:'progress',id:other,percent:30,note:'Saved once'}];
 const value=restore({rawQueue:JSON.stringify(queue)});assert.equal(value.revalidate,true);assert.deepEqual(value.queue,queue);assert.equal(value.snapshot.books.length,0);
});
test('offline recovery never displays another reader snapshot or trusts malformed data',()=>{
 for(const rawSnapshot of ['broken',JSON.stringify({...snapshot,userId:other})]){
  const value=restore({rawSnapshot});assert.equal(value.snapshot,null);assert.equal(value.phase,'loading');assert.equal(value.revalidate,true);
 }
 const offline=restore({online:false});assert.equal(offline.phase,'offline');assert.equal(offline.revalidate,false);assert.equal(offline.snapshot.userId,userId);
});
test('background appearance refresh accepts only validated current-reader preferences',()=>{
 assert.deepEqual(readerPreferencesResponse(userId,{userId,preferences:defaultReaderPreferences}),defaultReaderPreferences);
 assert.equal(readerPreferencesResponse(userId,{userId:other,preferences:defaultReaderPreferences}),null);
 assert.equal(readerPreferencesResponse(userId,{userId,preferences:{theme:'invalid'}}),null);
 assert.equal(readerPreferencesResponse(userId,null),null);
});
