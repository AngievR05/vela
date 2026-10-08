import {getReader} from "@/lib/auth/server";
import {readerDeniedResponse} from "@/lib/auth/http";
async function rows(supabase,table,userId){const output=[];for(let offset=0;offset<50000;offset+=500){const result=await supabase.from(table).select(table==="user_books"?"*,books(*)":"*").eq("user_id",userId).order(table==="ai_settings"?"user_id":"id").range(offset,offset+499);if(result.error)throw new Error("Export unavailable");output.push(...result.data);if(result.data.length<500)return output;}throw new Error("Export too large");}
export async function GET(){const reader=await getReader();const denied=readerDeniedResponse(reader);if(denied)return denied;
  try{const {data:profile,error}=await reader.supabase.from("profiles").select("*").eq("id",reader.user.id).single();if(error)throw error;
    const tables=["user_books","reading_dna_signals","recommendation_sessions","recommendations","recommendation_feedback","ai_settings"];
    const statsProbe=await reader.supabase.from("reader_book_stats").select("id").eq("user_id",reader.user.id).limit(1);
    if(!statsProbe.error)tables.push("reader_book_stats");else if(!["42P01","PGRST205"].includes(statsProbe.error.code))throw statsProbe.error;
    const dnaProbe=await reader.supabase.from("reading_dna_changes").select("id").eq("user_id",reader.user.id).limit(1);
    if(!dnaProbe.error)tables.push("reading_dna_changes");else if(!["42P01","PGRST205"].includes(dnaProbe.error.code))throw dnaProbe.error;
    const updatesProbe=await reader.supabase.from("reader_book_updates").select("id").eq("user_id",reader.user.id).limit(1);
    if(!updatesProbe.error)tables.push("reader_book_updates");else if(!["42P01","PGRST205"].includes(updatesProbe.error.code))throw updatesProbe.error;
    const values=await Promise.all(tables.map(table=>rows(reader.supabase,table,reader.user.id)));
    return Response.json({format:"vela-account-export-v1",exportedAt:new Date().toISOString(),account:{id:reader.user.id,email:reader.user.email,createdAt:reader.user.created_at},profile,...Object.fromEntries(tables.map((table,index)=>[table,values[index]]))},{headers:{"Cache-Control":"private, no-store","Content-Disposition":"attachment; filename=vela-account.json"}});
  }catch{return Response.json({error:"Your download could not be prepared. Please try again."},{status:503,headers:{"Cache-Control":"private, no-store"}});}}

