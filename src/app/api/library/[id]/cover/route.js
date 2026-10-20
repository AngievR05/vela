import {z} from "zod";
import {getReader} from "@/lib/auth/server";
import {readerDeniedResponse} from "@/lib/auth/http";
import {searchGoogleBooks,getGoogleBook} from "@/lib/google-books";
import {getGoogleIsbnCoverRequest} from "@/lib/google-books-request";
import {createCoverResolver,readerCover} from "@/lib/cover-resolution";
import {createIsbnCatalogue} from "@/lib/isbn-catalogue";
const resolve=createCoverResolver({isbnCover:getGoogleIsbnCoverRequest,search:searchGoogleBooks,lookup:getGoogleBook,findIsbns:createIsbnCatalogue()});
const headers={"Cache-Control":"private, no-store"};
export const maxDuration=90;
export async function GET(request,{params}) {
  const reader=await getReader(),denied=readerDeniedResponse(reader);if(denied)return denied;
  const {id}=await params;if(!z.uuid().safeParse(id).success)return new Response(null,{status:404,headers});
  try {const cover=await readerCover(reader.supabase,reader.user.id,id,resolve);return cover?new Response(null,{status:307,headers:{...headers,Location:cover}}):new Response(null,{status:404,headers});}
  catch{return new Response(null,{status:503,headers:{...headers,"Retry-After":"60"}});}
}
