import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";

// Report names/counts only. Never print configured credentials or matching text.
const env={...process.env};
for(const file of [".env.local",".env.auth-test.local"]){
 if(!fs.existsSync(file))continue;
 for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){
  const match=line.match(/^([A-Z_]+)=(.*)$/);if(match)env[match[1]]=match[2].replace(/^['"]|['"]$/g,"");
 }
}
const keys=["GEMINI_API_KEY","GOOGLE_BOOKS_API_KEY","SUPABASE_SERVICE_ROLE_KEY","VELA_TEST_PASSWORD"];
const values=keys.filter(key=>env[key]?.length>=8).map(key=>[key,Buffer.from(env[key])]);
function walk(directory){if(!fs.existsSync(directory))return[];return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);}
if(!fs.existsSync(".next/static"))throw new Error("Build the production client before scanning.");
const tracked=execFileSync("git",["ls-files","-z"],{encoding:"utf8"}).split("\0").filter(Boolean).filter(file=>fs.existsSync(file)&&fs.statSync(file).isFile());
const bundles=walk(".next/static"),findings=[];
for(const file of new Set([...tracked,...bundles,...walk("src"),...walk("docs")])){
 const data=fs.readFileSync(file);
 for(const [name,value] of values)if(data.includes(value))findings.push({file,name});
}
const result={date:new Date().toISOString().slice(0,10),trackedFiles:tracked.length,publicBuildFiles:bundles.length,configuredPrivateValuesChecked:values.map(([name])=>name),findings,passed:findings.length===0};
console.log(JSON.stringify(result,null,2));
if(!values.length||findings.length)process.exitCode=1;
