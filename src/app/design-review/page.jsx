"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import HomeScreen from "@/components/home/HomeScreen";
import LibraryScreen from "@/components/library/LibraryScreen";
import AddBookScreen from "@/components/library/AddBookScreen";
import BookDetail from "@/components/library/BookDetail";
import DiscoverScreen from "@/components/discover/DiscoverScreen";
import ReadingDNAScreen from "@/components/dna/ReadingDNAScreen";
import SettingsScreen from "@/components/settings/SettingsScreen";
import ReadingStatsScreen from "@/components/stats/ReadingStatsScreen";
import ReadingScreen from "@/components/reading/ReadingScreen";
import ReadingSetup from "@/components/setup/ReadingSetup";
import { defaultReaderPreferences } from "@/lib/reader-settings";
import { applyBookMutation } from "@/lib/home-data";

const userId="11111111-1111-4111-8111-111111111111";
const id=n=>`22222222-2222-4222-8222-${String(n).padStart(12,"0")}`;
const base={id:id(1),bookId:id(1),googleBooksId:"MUMIEAAAQBAJ",title:"Piranesi",author:"Susanna Clarke",pageCount:272,coverSrc:"https://books.google.com/books/content?id=MUMIEAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",status:"reading",progressPercent:45,currentPage:122,rating:null,dnfUse:false,startedAt:"2026-10-01",finishedAt:null,updatedAt:"2026-10-19T10:00:00Z",description:"Piranesi lives in the House. In his notebooks he records its wonders: the labyrinth of halls, the statues, and the tides.",categories:["Fantasy","Mystery"],publishedDate:"2020-09-15",isbn:null,favourite:false,notes:"",isRemoved:false};
const settings={userId,name:"Reader",email:"reader@example.test",createdAt:"2026-10-01T10:00:00Z",preferences:defaultReaderPreferences,permissions:{enabled:true,ratings:true,history:true,dnf:false}};
const signals=[{id:id(20),category:"genre",label:"Fantasy",source:"rating",strength:"strong",evidence:[]},{id:id(21),category:"pace",label:"Reflective",source:"onboarding",strength:"emerging",evidence:[]}];
const initial={version:1,userId,displayName:"Reader",fetchedAt:Date.now(),personalisationEnabled:true,learningPermissions:{ratings:true,history:true,dnf:false},signals,statsRecords:[],books:[base,{...base,id:id(2),bookId:id(2),status:"want_to_read",progressPercent:0,currentPage:0},{...base,id:id(3),bookId:id(3),status:"finished",progressPercent:100,currentPage:272,rating:5,finishedAt:"2026-10-16"},{...base,id:id(4),bookId:id(4),status:"dnf",dnfReason:"Too slow"}]};
const dna={userId,fetchedAt:Date.now(),enabled:true,completed:true,resetAt:null,undoable:null,signals:signals.map(s=>({...s,updatedAt:base.updatedAt,active:true,storedActive:true,influence:"normal",reason:"",summary:s.strength==="strong"?"Strong · 3 approved activities":"Emerging · Chosen by you",description:"An editable reading preference.",evidence:[{id:"choice",title:"Chosen reading preference",context:"Chosen by you",bookId:null}]}))};
const recs={version:1,userId,id:id(30),request:"Atmospheric fantasy with a mystery",filters:{source:"anywhere",genre:"",mood:"",length:"any"},createdAt:base.updatedAt,personalisationEnabled:true,recommendations:["Strong match","Good match","Experimental"].map((confidence,i)=>({id:id(31+i),rank:i+1,reason:"An atmospheric fantasy built around an intriguing mystery.",confidence,libraryId:null,book:{googleBooksId:base.googleBooksId,title:base.title,authors:[base.author],description:base.description,pageCount:base.pageCount,categories:base.categories,publishedDate:base.publishedDate,thumbnailUrl:base.coverSrc,isbn:null},feedback:null,signals:[]}))};

export default function Review(){
 const [ready,setReady]=useState(false),[screen,setScreen]=useState("home");
 useEffect(()=>{let snapshot=structuredClone(initial);const original=window.fetch;window.fetch=async(input,options={})=>{const url=new URL(String(input),location.origin);if(!url.pathname.startsWith("/api/"))return original(input,options);const mutation=options.body?JSON.parse(options.body):null;
  if(url.pathname==="/api/home"||url.pathname==="/api/library")return Response.json(snapshot);
  if(url.pathname.startsWith("/api/library/")){if(mutation){snapshot=applyBookMutation(snapshot,mutation);return Response.json({book:snapshot.books.find(b=>b.id===mutation.id),operationId:mutation.operationId});}return Response.json({book:snapshot.books[0]});}
  if(url.pathname==="/api/dna")return Response.json(dna);
  if(url.pathname==="/api/settings")return Response.json(settings);
  if(url.pathname==="/api/recommendations")return Response.json({session:options.method==="POST"?recs:null});
  if(url.pathname.endsWith("/insights"))return Response.json({pace:null,moods:[],tropes:[],source:"unavailable"});
  return Response.json({results:[],books:[]});};Promise.resolve().then(()=>setReady(true));return()=>{window.fetch=original;};},[]);
 const views={home:<HomeScreen userId={userId}/>,library:<LibraryScreen userId={userId}/>,add:<AddBookScreen userId={userId}/>,detail:<BookDetail userId={userId} initialBook={base}/>,discover:<DiscoverScreen userId={userId}/>,dna:<ReadingDNAScreen userId={userId}/>,stats:<ReadingStatsScreen userId={userId}/>,settings:<SettingsScreen initial={settings} userId={userId} email={settings.email}/>,reading:<ReadingScreen userId={userId}/>,setup:<ReadingSetup userId={userId} initial={{preferences:{genres:[],storyElements:[],pacing:"",moods:[]},permissions:{ratings:false,history:false,dnf:false},enabled:false,completed:false}}/>};
 return <><label style={{position:"fixed",right:4,top:2,zIndex:200,fontSize:10}}>Preview <select aria-label="Preview screen" value={screen} onChange={e=>setScreen(e.target.value)}>{Object.keys(views).map(v=><option key={v}>{v}</option>)}</select></label>{ready&&<AppShell showBottomNavigation={false}><div key={screen}>{views[screen]}</div></AppShell>}</>;
}
