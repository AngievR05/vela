import {getReader} from "@/lib/auth/server";
import {readerDeniedResponse} from "@/lib/auth/http";
import {loadReaderSettings,settingsMutationSchema} from "@/lib/reader-settings";
const headers={"Cache-Control":"private, no-store"};
export async function GET(){const reader=await getReader();const denied=readerDeniedResponse(reader);if(denied)return denied;
  try{return Response.json(await loadReaderSettings(reader.supabase,reader.user),{headers});}catch{return Response.json({error:"Settings could not load. Please try again."},{status:503,headers});}}
export async function PATCH(request){const reader=await getReader();const denied=readerDeniedResponse(reader);if(denied)return denied;
  const parsed=settingsMutationSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Check your settings and try again."},{status:400,headers});
  try{const result=await reader.supabase.rpc("save_reader_settings",{change:parsed.data});if(result.error)throw new Error("Save failed");return Response.json(await loadReaderSettings(reader.supabase,reader.user),{headers});}
  catch{return Response.json({error:"We couldn’t confirm your changes. Your choices are still here; please retry."},{status:503,headers});}}
