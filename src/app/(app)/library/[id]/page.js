import { notFound } from "next/navigation";
import { z } from "zod";
import { getReader } from "@/lib/auth/server";
import { loadReaderBook } from "@/lib/home-server";
import BookDetail from "@/components/library/BookDetail";
export const metadata={title:"Book detail"};
export default async function BookDetailPage({ params }) {
 const { id }=await params;if(!z.uuid().safeParse(id).success)notFound();
 const { user,supabase }=await getReader();const book=await loadReaderBook(supabase,user.id,id);if(!book)notFound();
 return <BookDetail key={`${user.id}:${id}`} userId={user.id} initialBook={book}/>;
}
