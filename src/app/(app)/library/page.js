import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BookCover from "@/components/books/BookCover";
import { getReader } from "@/lib/auth/server";
import { loadHome } from "@/lib/home-server";

export const metadata = { title: "Library" };
const groups = { reading: "Reading", want_to_read: "Saved for later", finished: "Finished", dnf: "Stopped reading" };

export default async function LibraryPage() {
  const { user, supabase } = await getReader();
  const { books } = await loadHome(supabase, user.id);
  return <section className="page">
    <p className="eyebrow">Library</p><h1 className="heading">Your books</h1>
    <p className="lead">Your saved books and reading progress.</p>
    <div className="heroActions"><Button href="/home?action=add">Add a book</Button><Button href="/home?action=library" variant="secondary">Manage reading progress</Button></div>
    {Object.entries(groups).map(([status, label]) => <section key={status} style={{ marginTop: "2rem" }}>
      <h2 className="subheading">{label}</h2>
      <div className="grid grid--3">{books.filter((book) => book.status === status).map((book) => <Card key={book.id}>
        <BookCover title={book.title} author={book.author} src={book.coverSrc} size="search" decorative />
        <h3 className="subheading">{book.title}</h3><p className="muted">{book.author}</p>
        {status === "reading" && <p>{book.progressPercent}% complete</p>}
        {book.rating != null && <p>Rated {book.rating} of 5</p>}
      </Card>)}</div>
      {!books.some((book) => book.status === status) && <p className="muted">No books here yet.</p>}
    </section>)}
  </section>;
}
