import {getReader} from "@/lib/auth/server";
import {readerDeniedResponse} from "@/lib/auth/http";
import {importBatchSchema,importLibraryRows} from "@/lib/library-import";
import {searchGoogleBooks} from "@/lib/google-books";
export const maxDuration=180;
export async function POST(request){const reader=await getReader();const denied=readerDeniedResponse(reader);if(denied)return denied;
  const text=await request.text();if(text.length>80000)return Response.json({error:"Import a smaller batch."},{status:413});
  let body;try{body=JSON.parse(text);}catch{return Response.json({error:"Invalid import batch."},{status:400});}
  const parsed=importBatchSchema.safeParse(body);if(!parsed.success)return Response.json({error:"Check the imported rows."},{status:400});
  const results=await importLibraryRows(reader.supabase,parsed.data.rows,searchGoogleBooks);
  return Response.json({results},{headers:{"Cache-Control":"private, no-store"}});
}
