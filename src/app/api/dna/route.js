import {getReader} from "@/lib/auth/server";
import {readerDeniedResponse} from "@/lib/auth/http";
import {loadReadingDNA} from "@/lib/reading-dna-server";
import {dnaMutationSchema} from "@/lib/reading-dna";
const headers={"Cache-Control":"private, no-store"};
export async function GET(){const reader=await getReader();const denied=readerDeniedResponse(reader);if(denied)return denied;
  try{return Response.json(await loadReadingDNA(reader.supabase,reader.user.id),{headers});}catch{return Response.json({error:"Your signals could not load. Please try again."},{status:503,headers});}}
export async function PATCH(request){const reader=await getReader();const denied=readerDeniedResponse(reader);if(denied)return denied;
  const parsed=dnaMutationSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Check your change and try again."},{status:400,headers});
  const change=parsed.data;
  const result=change.action==="reset"?await reader.supabase.rpc("reset_reading_dna",{operation:change.operationId}):await reader.supabase.rpc("change_reading_dna",{operation:change.operationId,signal_key:change.signalId||null,action:change.action,expected:change.expectedUpdatedAt||null,undo_key:change.changeId||null});
  if(result.error)return Response.json({error:result.error.code==="40001"?"This signal changed. Reload its evidence before saving again.":"We couldn’t confirm your change. Your choice is still here; please retry.",conflict:result.error.code==="40001"},{status:result.error.code==="40001"?409:503,headers});
  // A confirmed mutation remains confirmed even if the subsequent summary is unavailable.
  let snapshot=null;try{snapshot=await loadReadingDNA(reader.supabase,reader.user.id);}catch{/* The client can retry its read. */}
  return Response.json({saved:true,changeId:result.data,snapshot},{headers});
}
