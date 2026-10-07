import { z } from "zod";
import { getReader } from "@/lib/auth/server";
import { readerDeniedResponse } from "@/lib/auth/http";
import { loadReaderBook } from "@/lib/home-server";
import { generateStructured } from "@/lib/gemini";
import { bookCluesSchema, verifiedBookClues } from "@/lib/book-insights";
import { plainDescription } from "@/lib/library-data";

export async function POST(request,{params}) {
  const reader=await getReader();
  const denied=readerDeniedResponse(reader);if(denied)return denied;
  const {id}=await params;
  if(!z.uuid().safeParse(id).success)return Response.json({error:"Book not found."},{status:404});
  const headers={"Cache-Control":"private, no-store"};
  try {
    const book=await loadReaderBook(reader.supabase,reader.user.id,id);
    if(!book||book.isRemoved)return Response.json({error:"Book not found."},{status:404,headers});
    if(book.googleBooksId.startsWith("manual:")||!book.description)return Response.json({clues:{pace:null,moods:[],tropes:[]}},{headers});
    const value=await generateStructured(bookCluesSchema,
      "Extract provisional story pace, moods and tropes supported by the provided publisher book description. Every selected label requires an exact quote of 8–500 characters from description that supports that interpretation. Do not use prior knowledge, author biography, comparison titles, reviewer praise or invented plot details. Omit anything uncertain: pace=null, moods=[], tropes=[] are valid. Do not confuse a slow-burn romance with slow plot pacing. A genre alone does not establish mood or pace. These are book interpretations, never predictions of reader enjoyment.",
      {title:book.title,description:plainDescription(book.description).slice(0,10000)});
    return Response.json({clues:verifiedBookClues(value,book)},{headers});
  }catch{return Response.json({error:"Book clues couldn’t load. Your book and reading progress are safe; please try again."},{status:503,headers});}
}
