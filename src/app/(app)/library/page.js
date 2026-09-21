import Card from "@/components/ui/Card";

export const metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <section className="page">
      <p className="eyebrow">Library</p>
      <h1 className="heading">Your books</h1>
      <p className="lead">
        Search Google Books, then manage status, progress, rating and DNF information.
      </p>

      <div className="grid grid--3" style={{ marginTop: "2rem" }}>
        {["Reading", "TBR", "Finished", "DNF"].map((status) => (
          <Card key={status}>
            <p className="eyebrow">{status}</p>
            <p className="muted">Books with this status will appear here.</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
