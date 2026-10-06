import BookDiscovery from "@/components/discover/BookDiscovery";
import { getReader } from "@/lib/auth/server";
import { loadHome } from "@/lib/home-server";

export const metadata = { title: "Discover" };

export default async function DiscoverPage() {
  const { user, supabase } = await getReader();
  const { books } = await loadHome(supabase, user.id);
  return <section className="page page--narrow">
    <p className="eyebrow">Discover</p><h1 className="heading">Find my next read</h1>
    <p className="lead">Search by title, author or what you feel like reading, then save a book to your Library.</p>
    <BookDiscovery savedIds={books.map(book => book.googleBooksId)} />
  </section>;
}
