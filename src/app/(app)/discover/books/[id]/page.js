import { notFound, redirect } from "next/navigation";
import { getReader } from "@/lib/auth/server";
import { getGoogleBook } from "@/lib/google-books";
import CatalogueBookDetail from "@/components/discover/CatalogueBookDetail";
export const metadata={title:"Book detail"};
export default async function CataloguePage({ params }) {
  const { id }=await params;if(!/^[A-Za-z0-9_-]{1,100}$/.test(id))notFound();
  const reader=await getReader();
  const { data,error }=await reader.supabase.from("user_books").select("id,books!inner(google_books_id)").eq("user_id",reader.user.id).eq("is_removed",false).eq("books.google_books_id",id).maybeSingle();
  if(error)throw new Error("Your Library could not refresh. Please try again.");
  if(data)redirect(`/library/${data.id}`);
  const book=await getGoogleBook(id);if(!book)notFound();
  return <CatalogueBookDetail book={book}/>;
}
